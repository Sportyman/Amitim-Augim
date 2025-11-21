
import { UserRole } from '../types';

export const canEdit = (role: UserRole | null) => ['super_admin', 'admin', 'editor'].includes(role || '');
export const canDelete = (role: UserRole | null) => ['super_admin', 'admin'].includes(role || '');
export const canCreate = (role: UserRole | null) => ['super_admin', 'admin'].includes(role || '');
export const canManageUsers = (role: UserRole | null) => role === 'super_admin';

export const getRoleLabel = (role: UserRole | null) => {
    switch(role) {
        case 'super_admin': return 'מנהל על';
        case 'admin': return 'מנהל';
        case 'editor': return 'עורך';
        default: return 'אורח';
    }
};
