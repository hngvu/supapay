import { customAlphabet } from 'nanoid';

// Bỏ các ký tự dễ nhầm: O, 0, I, 1
const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const generate = customAlphabet(alphabet, 6);

export const generateContentCode = () => 'CK' + generate();