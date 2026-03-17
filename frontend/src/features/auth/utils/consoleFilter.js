// Filtro global para ocultar errores 401 en consola
const originalConsoleError = console.error;

console.error = function (...args) {
    if (args.length > 0 && typeof args[0] === 'string' && args[0].includes('401')) {
        // Ignorar errores 401
        return;
    }
    originalConsoleError.apply(console, args);
};

export default console.error;
