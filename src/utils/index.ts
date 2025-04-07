export const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
};

export const validateEmail = (email: string): boolean => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};

export const generateRandomId = (): string => {
    return Math.random().toString(36).substr(2, 9);
};