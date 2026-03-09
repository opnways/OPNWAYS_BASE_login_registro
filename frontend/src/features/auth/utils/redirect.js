export const isExternalUrl = (target) => /^https?:\/\//i.test(target);

export const redirectTo = (navigate, target, options = {}) => {
    if (!target) return;

    if (isExternalUrl(target)) {
        window.location.assign(target);
        return;
    }

    navigate(target, options);
};
