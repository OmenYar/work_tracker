import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Save, X, StickyNote, GripVertical, Maximize2, Minimize2, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

// Color options for notes
const NOTE_COLORS = [
    { name: 'Yellow', bg: 'bg-yellow-100 dark:bg-yellow-900/30', border: 'border-yellow-300 dark:border-yellow-700', text: 'text-yellow-900 dark:text-yellow-100' },
    { name: 'Blue', bg: 'bg-blue-100 dark:bg-blue-900/30', border: 'border-blue-300 dark:border-blue-700', text: 'text-blue-900 dark:text-blue-100' },
    { name: 'Green', bg: 'bg-green-100 dark:bg-green-900/30', border: 'border-green-300 dark:border-green-700', text: 'text-green-900 dark:text-green-100' },
    { name: 'Pink', bg: 'bg-pink-100 dark:bg-pink-900/30', border: 'border-pink-300 dark:border-pink-700', text: 'text-pink-900 dark:text-pink-100' },
    { name: 'Purple', bg: 'bg-purple-100 dark:bg-purple-900/30', border: 'border-purple-300 dark:border-purple-700', text: 'text-purple-900 dark:text-purple-100' },
    { name: 'Orange', bg: 'bg-orange-100 dark:bg-orange-900/30', border: 'border-orange-300 dark:border-orange-700', text: 'text-orange-900 dark:text-orange-100' },
];

const StickyNotes = () => {
    const [notes, setNotes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const { toast } = useToast();
    const { profile } = useAuth();

    useEffect(() => {
        fetchNotes();
    }, []);

    const fetchNotes = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const { data, error: fetchError } = await supabase
                .from('sticky_notes')
                .select('*')
                .order('is_pinned', { ascending: false })
                .order('updated_at', { ascending: false });

            if (fetchError) {
                console.error('Supabase error:', fetchError);
                throw fetchError;
            }

            setNotes(data || []);
        } catch (err) {
            console.error('Error fetching notes:', err);
            setError(err.message || 'Failed to load notes. Please check if the table exists.');
            setNotes([]);
        } finally {
            setIsLoading(false);
        }
    };

    const createNote = async () => {
        try {
            // Get current session
            const { data: sessionData } = await supabase.auth.getSession();
            const userId = sessionData?.session?.user?.id;

            const newNote = {
                title: 'New Note',
                content: '',
                color_index: Math.floor(Math.random() * NOTE_COLORS.length),
                is_pinned: false,
            };

            // Only add created_by if user is authenticated
            if (userId) {
                newNote.created_by = userId;
            }

            const { data, error } = await supabase
                .from('sticky_notes')
                .insert([newNote])
                .select()
                .single();

            if (error) {
                console.error('Insert error:', error);
                throw error;
            }

            setNotes(prev => [data, ...prev]);
            setEditingId(data.id);
            toast({ title: 'Note created', description: 'Start typing your note!' });
        } catch (error) {
            console.error('Error creating note:', error);
            toast({ variant: 'destructive', title: 'Error', description: `Failed to create note: ${error.message}` });
        }
    };

    const updateNote = async (id, updates) => {
        try {
            const { error } = await supabase
                .from('sticky_notes')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;

            setNotes(prev => prev.map(note =>
                note.id === id ? { ...note, ...updates } : note
            ));
        } catch (error) {
            console.error('Error updating note:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update note.' });
        }
    };

    const deleteNote = async (id) => {
        try {
            const { error } = await supabase
                .from('sticky_notes')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setNotes(prev => prev.filter(note => note.id !== id));
            toast({ title: 'Note deleted' });
        } catch (error) {
            console.error('Error deleting note:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete note.' });
        }
    };

    const togglePin = async (id, currentPinned) => {
        await updateNote(id, { is_pinned: !currentPinned });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-16 bg-card border rounded-xl">
                <AlertTriangle className="w-12 h-12 mx-auto text-destructive mb-4" />
                <h3 className="text-lg font-medium text-destructive mb-2">Failed to load notes</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">{error}</p>
                <Button onClick={fetchNotes} variant="outline" className="gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <StickyNote className="w-6 h-6 text-primary" />
                    <div>
                        <h2 className="text-2xl font-bold">Sticky Notes</h2>
                        <p className="text-sm text-muted-foreground">Quick notes for meetings & important reminders</p>
                    </div>
                </div>
                <Button onClick={createNote} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Note
                </Button>
            </div>

            {/* Notes Grid */}
            {notes.length === 0 ? (
                <div className="text-center py-16 bg-card border rounded-xl">
                    <StickyNote className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                    <h3 className="text-lg font-medium text-muted-foreground mb-2">No notes yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">Create your first sticky note to get started</p>
                    <Button onClick={createNote} variant="outline" className="gap-2">
                        <Plus className="w-4 h-4" />
                        Create Note
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    <AnimatePresence>
                        {notes.map((note) => {
                            const color = NOTE_COLORS[note.color_index] || NOTE_COLORS[0];
                            const isEditing = editingId === note.id;

                            return (
                                <motion.div
                                    key={note.id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    layout
                                    className={`relative rounded - lg border - 2 shadow - md ${color.bg} ${color.border} ${color.text} ${note.is_pinned ? 'ring-2 ring-primary' : ''} `}
                                >
                                    {/* Note Header */}
                                    <div className="flex items-center justify-between p-3 border-b border-current/10">
                                        {isEditing ? (
                                            <Input
                                                value={note.title}
                                                onChange={(e) => setNotes(prev => prev.map(n =>
                                                    n.id === note.id ? { ...n, title: e.target.value } : n
                                                ))}
                                                onBlur={() => updateNote(note.id, { title: note.title })}
                                                className="h-7 text-sm font-semibold bg-transparent border-0 p-0 focus-visible:ring-0"
                                                placeholder="Note title..."
                                            />
                                        ) : (
                                            <h3 className="font-semibold text-sm truncate flex-1" onClick={() => setEditingId(note.id)}>
                                                {note.title || 'Untitled'}
                                            </h3>
                                        )}
                                        <div className="flex items-center gap-1 ml-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
                                                onClick={() => togglePin(note.id, note.is_pinned)}
                                                title={note.is_pinned ? 'Unpin' : 'Pin'}
                                            >
                                                {note.is_pinned ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 opacity-60 hover:opacity-100 hover:text-destructive"
                                                onClick={() => deleteNote(note.id)}
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Note Content */}
                                    <div className="p-3 min-h-[120px]">
                                        {isEditing ? (
                                            <Textarea
                                                value={note.content}
                                                onChange={(e) => setNotes(prev => prev.map(n =>
                                                    n.id === note.id ? { ...n, content: e.target.value } : n
                                                ))}
                                                onBlur={() => {
                                                    updateNote(note.id, { content: note.content });
                                                    setEditingId(null);
                                                }}
                                                className="min-h-[100px] text-sm bg-transparent border-0 p-0 resize-none focus-visible:ring-0"
                                                placeholder="Write your note here..."
                                                autoFocus
                                            />
                                        ) : (
                                            <p
                                                className="text-sm whitespace-pre-wrap cursor-pointer min-h-[100px]"
                                                onClick={() => setEditingId(note.id)}
                                            >
                                                {note.content || 'Click to add content...'}
                                            </p>
                                        )}
                                    </div>

                                    {/* Note Footer */}
                                    <div className="px-3 pb-2 flex items-center justify-between">
                                        <div className="flex gap-1">
                                            {NOTE_COLORS.map((c, idx) => (
                                                <button
                                                    key={idx}
                                                    className={`w - 4 h - 4 rounded - full ${c.bg} ${c.border} border hover: scale - 110 transition - transform ${note.color_index === idx ? 'ring-2 ring-offset-1 ring-primary' : ''} `}
                                                    onClick={() => updateNote(note.id, { color_index: idx })}
                                                    title={c.name}
                                                />
                                            ))}
                                        </div>
                                        <span className="text-[10px] opacity-50">
                                            {new Date(note.updated_at || note.created_at).toLocaleDateString('id-ID', {
                                                day: 'numeric',
                                                month: 'short',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
};

export default StickyNotes;
