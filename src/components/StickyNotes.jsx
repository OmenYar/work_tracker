import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Trash2, Search, ChevronRight, Pin, PinOff,
    FileText, Folder, Clock, AlertTriangle, RefreshCw,
    MoreHorizontal, Star, Archive
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const Notes = () => {
    const [notes, setNotes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedNote, setSelectedNote] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();
    const { user } = useAuth();

    useEffect(() => {
        if (user) {
            fetchNotes();
        } else {
            setNotes([]);
            setIsLoading(false);
        }
    }, [user]);

    const fetchNotes = async () => {
        try {
            setIsLoading(true);
            setError(null);

            if (!user?.id) return;

            const { data, error: fetchError } = await supabase
                .from('sticky_notes')
                .select('*')
                .eq('created_by', user.id)
                .order('is_pinned', { ascending: false })
                .order('updated_at', { ascending: false });

            if (fetchError) throw fetchError;

            setNotes(data || []);
            // Select first note if none selected
            if (data?.length > 0 && !selectedNote) {
                setSelectedNote(data[0]);
            }
        } catch (err) {
            console.error('Error fetching notes:', err);
            setError('Failed to load notes: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const createNote = async () => {
        try {
            if (!user?.id) {
                toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
                return;
            }

            const newNote = {
                title: '',
                content: '',
                color_index: 0,
                is_pinned: false,
                created_by: user.id
            };

            const { data, error } = await supabase
                .from('sticky_notes')
                .insert([newNote])
                .select()
                .single();

            if (error) throw error;

            setNotes(prev => [data, ...prev]);
            setSelectedNote(data);
            toast({ title: 'New note created' });
        } catch (error) {
            console.error('Error creating note:', error);
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    const updateNote = async (updates) => {
        if (!selectedNote) return;

        try {
            setIsSaving(true);

            // Optimistic update
            const updatedNote = { ...selectedNote, ...updates };
            setSelectedNote(updatedNote);
            setNotes(prev => prev.map(note =>
                note.id === selectedNote.id ? updatedNote : note
            ));

            const { error } = await supabase
                .from('sticky_notes')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', selectedNote.id)
                .eq('created_by', user.id);

            if (error) throw error;
        } catch (error) {
            console.error('Error updating note:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to save note.' });
            fetchNotes();
        } finally {
            setIsSaving(false);
        }
    };

    const deleteNote = async (noteId) => {
        try {
            setNotes(prev => prev.filter(note => note.id !== noteId));

            if (selectedNote?.id === noteId) {
                const remaining = notes.filter(n => n.id !== noteId);
                setSelectedNote(remaining[0] || null);
            }

            const { error } = await supabase
                .from('sticky_notes')
                .delete()
                .eq('id', noteId)
                .eq('created_by', user.id);

            if (error) throw error;

            toast({ title: 'Note deleted' });
        } catch (error) {
            console.error('Error deleting note:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete note.' });
            fetchNotes();
        }
    };

    const togglePin = async (noteId) => {
        const note = notes.find(n => n.id === noteId);
        if (!note) return;

        const newPinned = !note.is_pinned;

        setNotes(prev => prev.map(n =>
            n.id === noteId ? { ...n, is_pinned: newPinned } : n
        ));

        if (selectedNote?.id === noteId) {
            setSelectedNote(prev => ({ ...prev, is_pinned: newPinned }));
        }

        try {
            const { error } = await supabase
                .from('sticky_notes')
                .update({ is_pinned: newPinned, updated_at: new Date().toISOString() })
                .eq('id', noteId)
                .eq('created_by', user.id);

            if (error) throw error;
        } catch (error) {
            console.error('Error toggling pin:', error);
            fetchNotes();
        }
    };

    // Filter notes by search
    const filteredNotes = useMemo(() => {
        if (!searchQuery) return notes;
        const query = searchQuery.toLowerCase();
        return notes.filter(note =>
            (note.title || '').toLowerCase().includes(query) ||
            (note.content || '').toLowerCase().includes(query)
        );
    }, [notes, searchQuery]);

    // Group notes by pinned
    const pinnedNotes = filteredNotes.filter(n => n.is_pinned);
    const otherNotes = filteredNotes.filter(n => !n.is_pinned);

    // Format date
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) {
            return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        } else if (days === 1) {
            return 'Yesterday';
        } else if (days < 7) {
            return date.toLocaleDateString('id-ID', { weekday: 'short' });
        } else {
            return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        }
    };

    // Get note preview text
    const getPreview = (content, maxLength = 60) => {
        if (!content) return 'No additional text';
        const firstLine = content.split('\n')[0];
        if (firstLine.length > maxLength) {
            return firstLine.substring(0, maxLength) + '...';
        }
        return firstLine || 'No additional text';
    };

    // Get note title (first line or "New Note")
    const getNoteTitle = (note) => {
        if (note.title) return note.title;
        if (note.content) {
            const firstLine = note.content.split('\n')[0];
            return firstLine.substring(0, 50) || 'New Note';
        }
        return 'New Note';
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[500px]">
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
        <div className="flex h-[calc(100vh-200px)] min-h-[500px] bg-card border rounded-xl overflow-hidden">
            {/* Sidebar - Note List */}
            <div className="w-80 border-r flex flex-col bg-muted/30">
                {/* Sidebar Header */}
                <div className="p-4 border-b">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Folder className="w-5 h-5 text-yellow-500" />
                            <h2 className="font-semibold">Notes</h2>
                            <span className="text-xs text-muted-foreground">({notes.length})</span>
                        </div>
                        <Button size="icon" variant="ghost" onClick={createNote} className="h-8 w-8">
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-9 bg-background"
                        />
                    </div>
                </div>

                {/* Notes List */}
                <div className="flex-1 overflow-y-auto">
                    {filteredNotes.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No notes found</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {/* Pinned Notes */}
                            {pinnedNotes.length > 0 && (
                                <div>
                                    <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                        <Pin className="w-3 h-3" />
                                        Pinned
                                    </div>
                                    {pinnedNotes.map((note) => (
                                        <NoteListItem
                                            key={note.id}
                                            note={note}
                                            isSelected={selectedNote?.id === note.id}
                                            onClick={() => setSelectedNote(note)}
                                            getTitle={getNoteTitle}
                                            getPreview={getPreview}
                                            formatDate={formatDate}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Other Notes */}
                            {otherNotes.length > 0 && (
                                <div>
                                    {pinnedNotes.length > 0 && (
                                        <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            Notes
                                        </div>
                                    )}
                                    {otherNotes.map((note) => (
                                        <NoteListItem
                                            key={note.id}
                                            note={note}
                                            isSelected={selectedNote?.id === note.id}
                                            onClick={() => setSelectedNote(note)}
                                            getTitle={getNoteTitle}
                                            getPreview={getPreview}
                                            formatDate={formatDate}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content - Note Editor */}
            <div className="flex-1 flex flex-col">
                {selectedNote ? (
                    <>
                        {/* Editor Header */}
                        <div className="flex items-center justify-between p-4 border-b">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="w-4 h-4" />
                                <span>
                                    {new Date(selectedNote.updated_at || selectedNote.created_at).toLocaleString('id-ID', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </span>
                                {isSaving && <span className="text-xs text-primary">Saving...</span>}
                            </div>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => togglePin(selectedNote.id)}
                                    className="h-8 w-8"
                                    title={selectedNote.is_pinned ? 'Unpin' : 'Pin'}
                                >
                                    {selectedNote.is_pinned ? (
                                        <PinOff className="w-4 h-4 text-yellow-500" />
                                    ) : (
                                        <Pin className="w-4 h-4" />
                                    )}
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <MoreHorizontal className="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => togglePin(selectedNote.id)}>
                                            {selectedNote.is_pinned ? (
                                                <><PinOff className="w-4 h-4 mr-2" /> Unpin</>
                                            ) : (
                                                <><Pin className="w-4 h-4 mr-2" /> Pin to Top</>
                                            )}
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={() => deleteNote(selectedNote.id)}
                                            className="text-destructive focus:text-destructive"
                                        >
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Delete Note
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>

                        {/* Editor Content */}
                        <div className="flex-1 p-6 overflow-y-auto">
                            {/* Title */}
                            <Input
                                value={selectedNote.title || ''}
                                onChange={(e) => {
                                    setSelectedNote(prev => ({ ...prev, title: e.target.value }));
                                    setNotes(prev => prev.map(n =>
                                        n.id === selectedNote.id ? { ...n, title: e.target.value } : n
                                    ));
                                }}
                                onBlur={() => updateNote({ title: selectedNote.title })}
                                placeholder="Title"
                                className="text-2xl font-bold border-0 p-0 h-auto focus-visible:ring-0 bg-transparent mb-4"
                            />

                            {/* Content */}
                            <Textarea
                                value={selectedNote.content || ''}
                                onChange={(e) => {
                                    setSelectedNote(prev => ({ ...prev, content: e.target.value }));
                                    setNotes(prev => prev.map(n =>
                                        n.id === selectedNote.id ? { ...n, content: e.target.value } : n
                                    ));
                                }}
                                onBlur={() => updateNote({ content: selectedNote.content })}
                                placeholder="Start writing..."
                                className="min-h-[400px] text-base border-0 p-0 resize-none focus-visible:ring-0 bg-transparent leading-relaxed"
                            />
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                            <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
                            <p className="text-lg mb-2">No note selected</p>
                            <p className="text-sm mb-4">Select a note from the list or create a new one</p>
                            <Button onClick={createNote} className="gap-2">
                                <Plus className="w-4 h-4" />
                                New Note
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Note List Item Component
const NoteListItem = ({ note, isSelected, onClick, getTitle, getPreview, formatDate }) => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={onClick}
            className={cn(
                "px-4 py-3 cursor-pointer transition-colors border-l-2",
                isSelected
                    ? "bg-primary/10 border-l-primary"
                    : "border-l-transparent hover:bg-muted/50"
            )}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">
                        {getTitle(note)}
                    </h4>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {getPreview(note.content)}
                    </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[10px] text-muted-foreground">
                        {formatDate(note.updated_at || note.created_at)}
                    </span>
                    {note.is_pinned && (
                        <Pin className="w-3 h-3 text-yellow-500" />
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default Notes;
