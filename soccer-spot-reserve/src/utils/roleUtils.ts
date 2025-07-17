
export const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case 'super_admin': return 'bg-red-100 text-red-800';
    case 'admin_general': return 'bg-purple-100 text-purple-800';
    case 'admin_fields': return 'bg-blue-100 text-blue-800';
    case 'admin_users': return 'bg-green-100 text-green-800';
    case 'moderator': return 'bg-yellow-100 text-yellow-800';
    case 'owner': return 'bg-orange-100 text-orange-800';
    case 'player': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const getRoleLabel = (role: string) => {
  switch (role) {
    case 'super_admin': return 'Super Admin';
    case 'admin_general': return 'Admin Général';
    case 'admin_fields': return 'Admin Terrains';
    case 'admin_users': return 'Admin Utilisateurs';
    case 'moderator': return 'Modérateur';
    case 'owner': return 'Propriétaire';
    case 'player': return 'Joueur';
    default: return role;
  }
};
