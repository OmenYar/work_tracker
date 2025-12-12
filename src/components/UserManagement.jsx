import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Trash2, UserPlus, Loader2 } from 'lucide-react';
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

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const { toast } = useToast();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: '',
        role: 'AM', // Default
    });

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
            // Call the Edge Function to create the user securely
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
            console.error('Creation error:', error);
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message || "Failed to create user. Please try again.",
            });
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteUser = async (id) => {
        try {
            // Note: This only deletes the profile. 
            // In a real app, you'd also want to delete the auth user via another Edge Function.
            const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', id);

            if (error) throw error;

            fetchUsers();
            toast({
                title: "User Profile Deleted",
                description: "Profile removed successfully.",
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to delete user.",
            });
        }
    };

    return (
        <div className="space-y-8">
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
                                <SelectItem value="Administrator">Administrator</SelectItem>
                                <SelectItem value="AM">AM</SelectItem>
                                <SelectItem value="SPV Jabo Outer 1">SPV Jabo Outer 1</SelectItem>
                                <SelectItem value="SPV Jabo Outer 2">SPV Jabo Outer 2</SelectItem>
                                <SelectItem value="SPV Jabo Outer 3">SPV Jabo Outer 3</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button type="submit" disabled={creating}>
                        {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Account"}
                    </Button>
                </form>
            </div>

            <div className="rounded-xl border bg-card overflow-hidden shadow">
                <div className="p-6 border-b">
                    <h2 className="text-lg font-semibold">System Users</h2>
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
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-muted/50">
                                    <td className="px-6 py-3 font-medium">{user.name}</td>
                                    <td className="px-6 py-3">{user.email}</td>
                                    <td className="px-6 py-3">
                                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-primary/10 text-primary">
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-right">
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
                                                        This action cannot be undone. This will remove the user profile from the list.
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
                                    </td>
                                </tr>
                            ))}
                            {users.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                                        No users found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default UserManagement;