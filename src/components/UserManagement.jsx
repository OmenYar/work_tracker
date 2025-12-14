import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Trash2, UserPlus, Loader2, Edit, X, Save } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const { toast } = useToast();

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: '',
        role: 'AM',
    });

    const [editFormData, setEditFormData] = useState({
        name: '',
        email: '',
        role: '',
        newPassword: '',
    });

    const roleOptions = [
        { value: 'Administrator', label: 'Administrator' },
        { value: 'AM', label: 'AM' },
        { value: 'SPV Jabo Outer 1', label: 'SPV Jabo Outer 1' },
        { value: 'SPV Jabo Outer 2', label: 'SPV Jabo Outer 2' },
        { value: 'SPV Jabo Outer 3', label: 'SPV Jabo Outer 3' },
    ];

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to load users",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        setCreating(true);

        try {
            const { data, error } = await supabase.functions.invoke('create-user', {
                body: formData
            });

            if (error) throw error;
            if (data && !data.success) throw new Error(data.error || 'Failed to create user');

            toast({
                title: "User Created Successfully",
                description: `Account for ${formData.email} has been created.`,
            });

            setFormData({ email: '', password: '', name: '', role: 'AM' });
            fetchUsers();

        } catch (error) {
            console.error('Edge Function error:', error);

            try {
                const { data: authData, error: signUpError } = await supabase.auth.signUp({
                    email: formData.email,
                    password: formData.password,
                    options: {
                        data: {
                            name: formData.name,
                            role: formData.role,
                        }
                    }
                });

                if (signUpError) throw signUpError;

                if (authData?.user) {
                    const { error: profileError } = await supabase
                        .from('profiles')
                        .upsert({
                            id: authData.user.id,
                            email: formData.email,
                            name: formData.name,
                            role: formData.role,
                        });

                    if (profileError) {
                        console.error('Profile creation error:', profileError);
                    }

                    toast({
                        title: "User Created",
                        description: `Account for ${formData.email} has been created.`,
                    });

                    setFormData({ email: '', password: '', name: '', role: 'AM' });
                    fetchUsers();
                }
            } catch (fallbackError) {
                console.error('Fallback error:', fallbackError);
                toast({
                    variant: "destructive",
                    title: "Error Creating User",
                    description: fallbackError.message || "Failed to create user.",
                });
            }
        } finally {
            setCreating(false);
        }
    };

    // Open edit dialog
    const handleEditClick = (user) => {
        setEditingUser(user);
        setEditFormData({
            name: user.name || '',
            email: user.email || '',
            role: user.role || 'AM',
            newPassword: '',
        });
        setEditDialogOpen(true);
    };

    // Save user edits
    const handleSaveUser = async () => {
        if (!editingUser) return;
        setUpdating(true);

        try {
            // Update profile in database
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    name: editFormData.name,
                    email: editFormData.email,
                    role: editFormData.role,
                })
                .eq('id', editingUser.id);

            if (profileError) throw profileError;

            // If password is provided, try to update via Edge Function
            if (editFormData.newPassword && editFormData.newPassword.length >= 6) {
                try {
                    const { data, error } = await supabase.functions.invoke('update-user', {
                        body: {
                            userId: editingUser.id,
                            email: editFormData.email,
                            password: editFormData.newPassword,
                        }
                    });

                    if (error) {
                        console.warn('Password update via Edge Function failed:', error);
                        toast({
                            title: "Profile Updated",
                            description: "Profile saved. Password change requires Edge Function deployment.",
                            variant: "default",
                        });
                    } else if (data?.success) {
                        toast({
                            title: "User Updated",
                            description: "Profile and password have been updated.",
                        });
                    }
                } catch (funcError) {
                    console.warn('Edge Function not available for password update:', funcError);
                    toast({
                        title: "Profile Updated",
                        description: "Profile saved. To update password, deploy the update-user Edge Function.",
                        variant: "default",
                    });
                }
            } else {
                toast({
                    title: "User Updated",
                    description: `Profile for ${editFormData.name} has been updated.`,
                });
            }

            setEditDialogOpen(false);
            setEditingUser(null);
            fetchUsers();

        } catch (error) {
            console.error('Update error:', error);
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message || "Failed to update user.",
            });
        } finally {
            setUpdating(false);
        }
    };

    const handleDeleteUser = async (id) => {
        try {
            const { data, error } = await supabase.functions.invoke('delete-user', {
                body: { userId: id }
            });

            if (error) throw error;
            if (data && !data.success) throw new Error(data.error || 'Failed to delete user');

            fetchUsers();
            toast({
                title: "User Deleted",
                description: "User has been removed successfully.",
            });
        } catch (error) {
            console.error('Delete error:', error);

            try {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .delete()
                    .eq('id', id);

                if (profileError) throw profileError;

                fetchUsers();
                toast({
                    title: "Profile Deleted",
                    description: "User profile removed.",
                    variant: "default"
                });
            } catch (fallbackError) {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: error.message || "Failed to delete user.",
                });
            }
        }
    };

    return (
        <div className="space-y-8">
            {/* Create User Form */}
            <div className="rounded-xl border bg-card p-6 shadow">
                <h2 className="text-lg font-semibold mb-4 flex items-center">
                    <UserPlus className="w-5 h-5 mr-2" />
                    Create New User
                </h2>
                <form onSubmit={handleAddUser} className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 items-end">
                    <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                            type="email"
                            required
                            placeholder="user@company.com"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Password</Label>
                        <Input
                            type="text"
                            required
                            placeholder="Set initial password"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Full Name</Label>
                        <Input
                            required
                            placeholder="John Doe"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Role</Label>
                        <Select
                            value={formData.role}
                            onValueChange={val => setFormData({ ...formData, role: val })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {roleOptions.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button type="submit" disabled={creating}>
                        {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Account"}
                    </Button>
                </form>
            </div>

            {/* Users Table */}
            <div className="rounded-xl border bg-card overflow-hidden shadow">
                <div className="p-6 border-b">
                    <h2 className="text-lg font-semibold">System Users</h2>
                    <p className="text-sm text-muted-foreground mt-1">Manage user accounts and permissions</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground">
                            <tr>
                                <th className="px-6 py-3 font-medium">Name</th>
                                <th className="px-6 py-3 font-medium">Email</th>
                                <th className="px-6 py-3 font-medium">Role</th>
                                <th className="px-6 py-3 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                                        No users found.
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className="hover:bg-muted/50">
                                        <td className="px-6 py-3 font-medium">{user.name}</td>
                                        <td className="px-6 py-3">{user.email}</td>
                                        <td className="px-6 py-3">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${user.role === 'Administrator'
                                                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                                                    : user.role === 'AM'
                                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                                        : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                }`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {/* Edit Button */}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleEditClick(user)}
                                                    title="Edit User"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Button>

                                                {/* Delete Button */}
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Delete User?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                This action cannot be undone. This will remove the user "{user.name}" from the system.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteUser(user.id)} className="bg-destructive">
                                                                Delete
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit User Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit User</DialogTitle>
                        <DialogDescription>
                            Update user information. Leave password empty to keep current password.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Full Name</Label>
                            <Input
                                id="edit-name"
                                value={editFormData.name}
                                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                                placeholder="Full Name"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-email">Email</Label>
                            <Input
                                id="edit-email"
                                type="email"
                                value={editFormData.email}
                                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                                placeholder="Email"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-role">Role</Label>
                            <Select
                                value={editFormData.role}
                                onValueChange={(val) => setEditFormData({ ...editFormData, role: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {roleOptions.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-password">New Password (optional)</Label>
                            <Input
                                id="edit-password"
                                type="password"
                                value={editFormData.newPassword}
                                onChange={(e) => setEditFormData({ ...editFormData, newPassword: e.target.value })}
                                placeholder="Leave empty to keep current"
                            />
                            <p className="text-xs text-muted-foreground">
                                Minimum 6 characters. Requires update-user Edge Function for password changes.
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveUser} disabled={updating}>
                            {updating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default UserManagement;