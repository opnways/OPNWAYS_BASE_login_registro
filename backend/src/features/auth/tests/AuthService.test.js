import { createAuthService } from '../services/AuthService.js';

describe('AuthService refresh() transactional behavior', () => {
    let mockClient;
    let mockRepo;
    let mockTokenService;
    let mockGetDbClient;
    let authService;

    beforeEach(() => {
        // Mocks the database client for transaction checking
        mockClient = {
            query: jest.fn(),
            release: jest.fn()
        };

        mockGetDbClient = jest.fn().mockResolvedValue(mockClient);

        // Mocks dependencies
        mockRepo = {
            findRefreshTokenAllStates: jest.fn(),
            revokeAllUserRefreshTokens: jest.fn(),
            saveRefreshToken: jest.fn(),
            revokeRefreshToken: jest.fn()
        };

        mockTokenService = {
            generateTokenPair: jest.fn()
        };

        authService = createAuthService({
            repo: mockRepo,
            tokenService: mockTokenService,
            emailSender: {},
            getDbClient: mockGetDbClient
        });
    });

    it('should successfully refresh token and strictly commit transaction once', async () => {
        const dummyTokenData = {
            id: 1, user_id: 123, revoked_at: null, expires_at: new Date(Date.now() + 100000)
        };
        mockRepo.findRefreshTokenAllStates.mockResolvedValue(dummyTokenData);
        mockTokenService.generateTokenPair.mockReturnValue({
            accessToken: 'acc', refreshToken: 'ref', refreshTokenHash: 'hash', expiresAt: new Date()
        });
        mockRepo.saveRefreshToken.mockResolvedValue(999);

        const result = await authService.refresh('some-hash', { ip: '127.0.0.1', userAgent: 'test' });

        expect(result.accessToken).toBe('acc');
        expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
        expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
        expect(mockClient.query).not.toHaveBeenCalledWith('ROLLBACK');
        expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback and throw if token does not exist', async () => {
        mockRepo.findRefreshTokenAllStates.mockResolvedValue(null);

        await expect(authService.refresh('invalid-hash')).rejects.toThrow('Token de refresco inválido o modificado');

        expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
        expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        expect(mockClient.query).toHaveBeenCalledTimes(2); // Only BEGIN and ROLLBACK
        expect(mockClient.release).toHaveBeenCalled();
    });

    it('should commit explicit revocation but throw when reuse is detected', async () => {
        const reusedTokenData = {
            id: 1, user_id: 123, revoked_at: new Date(), expires_at: new Date(Date.now() + 100000)
        };
        mockRepo.findRefreshTokenAllStates.mockResolvedValue(reusedTokenData);

        await expect(authService.refresh('reused-hash')).rejects.toThrow('SESSION_REVOKED');

        expect(mockRepo.revokeAllUserRefreshTokens).toHaveBeenCalledWith(123, mockClient);

        // Ensure that it COMMITS the revocation to fully punish the user's hijacked state
        expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
        expect(mockClient.query).toHaveBeenCalledWith('COMMIT');

        // Critically: It should NOT retry to rollback in the catch block because isTxActive is false
        expect(mockClient.query).not.toHaveBeenCalledWith('ROLLBACK');

        expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback if an unexpected internal error occurs during DB execution', async () => {
        const dummyTokenData = {
            id: 1, user_id: 123, revoked_at: null, expires_at: new Date(Date.now() + 100000)
        };
        mockRepo.findRefreshTokenAllStates.mockResolvedValue(dummyTokenData);

        // Simulate a DB failure during subsequent operations
        mockTokenService.generateTokenPair.mockImplementation(() => {
            throw new Error('Unexpected Crypto Failure');
        });

        await expect(authService.refresh('some-hash')).rejects.toThrow('Unexpected Crypto Failure');

        expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
        expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        expect(mockClient.release).toHaveBeenCalled();
    });
});
