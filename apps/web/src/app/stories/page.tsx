"use client";

import React, { useState } from "react";
import { FolderHeart, Plus, Trash2, Clock, Play, Server, ListMusic, AudioLines, Settings2, Share2, Layers } from "lucide-react";
import { useStories, useCreateStory, useDeleteStory, useStoryDetails, useAddStoryItem, useDeleteStoryItem } from "@/hooks/api/useStories";
import { useHistory } from "@/hooks/api/useHistory";
import { Button, Input, Modal, AudioPlayer, Card, CardHeader, CardTitle, CardContent } from "@resound-studio/ui";
import { StoryItemResponse } from "@resound-studio/shared";

export default function StoriesPage() {
    const { data: stories, isLoading } = useStories();
    const createStory = useCreateStory();
    const deleteStory = useDeleteStory();

    const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Create form
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");

    const handleCreate = async () => {
        if (!name.trim()) return;
        const newStory = await createStory.mutateAsync({ name, description });
        setIsCreateModalOpen(false);
        setName("");
        setDescription("");
        setSelectedStoryId(newStory.id);
    };

    if (selectedStoryId) {
        return <TimelineEditor storyId={selectedStoryId} onBack={() => setSelectedStoryId(null)} />;
    }

    return (
        <div className="page-container-xl">
            {/* Header */}
            <div className="page-hero mb-8 flex justify-between items-center">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-emerald-400 border-2 border-slate-900 shadow-[4px_4px_0_#0f172a] flex items-center justify-center">
                        <FolderHeart size={26} className="text-slate-900" strokeWidth={3} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-100">Stories & Projects</h1>
                        <p className="font-semibold text-slate-400">Combine generated clips into multi-track timelines</p>
                    </div>
                </div>
                <Button onClick={() => setIsCreateModalOpen(true)} className="shadow-[4px_4px_0_#000]">
                    <Plus className="h-4 w-4 mr-2" />
                    New Project
                </Button>
            </div>

            {/* List */}
            {isLoading ? (
                <div className="p-12 text-center text-slate-400 animate-pulse font-bold tracking-widest uppercase">Loading Projects...</div>
            ) : stories?.length === 0 ? (
                <div className="max-w-md mx-auto text-center py-24">
                    <Layers size={64} className="mx-auto mb-6 text-slate-700" strokeWidth={1} />
                    <h3 className="text-xl font-black uppercase text-slate-200 mb-2">No Projects Yet</h3>
                    <p className="text-slate-400 mb-8 font-medium">Create a timeline project to stitch multiple generations and voices together.</p>
                    <Button onClick={() => setIsCreateModalOpen(true)}>Create First Project</Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {stories?.map((story) => (
                        <div
                            key={story.id}
                            onClick={() => setSelectedStoryId(story.id)}
                            className="bg-slate-900/40 border border-slate-800 p-6 rounded-xl cursor-pointer hover:bg-slate-800/60 hover:-translate-y-1 transition-all group"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="font-black text-lg text-slate-100">{story.name}</h3>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm(`Delete project "${story.name}"?`)) deleteStory.mutate(story.id);
                                    }}
                                    className="text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            <p className="text-sm text-slate-400 mb-6 min-h-[40px]">{story.description || "No description."}</p>
                            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                                <span>{new Date(story.updated_at).toLocaleDateString()}</span>
                                <span className="flex items-center gap-1"><AudioLines size={12} /> {story.items?.length || 0} Clips</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Create New Project"
                description="A workspace to map out long-form audio with multiple dialogue clips."
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Project Name</label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Audiobook Chapter 1" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Description (Optional)</label>
                        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief synopsis or notes" />
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                        <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreate} disabled={!name.trim() || createStory.isPending}>Create Project</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

// ---- Subcomponent: Timeline Editor ----
function TimelineEditor({ storyId, onBack }: { storyId: string, onBack: () => void }) {
    const { data: story, isLoading } = useStoryDetails(storyId);
    const { data: history } = useHistory({ limit: 50 }); // Fetch recent generations to add to timeline

    const addItem = useAddStoryItem();
    const deleteItem = useDeleteStoryItem();

    const [isLibraryOpen, setIsLibraryOpen] = useState(false);

    if (isLoading) {
        return <div className="p-12 text-center text-slate-400 animate-pulse font-bold tracking-widest uppercase">Loading Timeline...</div>;
    }

    if (!story) return null;

    const handleAddClip = (generationId: string) => {
        // Find latest position
        const lastPosition = story.items.reduce((max: number, item: StoryItemResponse) => Math.max(max, item.position_ms + (item.generation?.duration_seconds || 0) * 1000), 0);

        addItem.mutate({
            storyId,
            generation_id: generationId,
            position_ms: lastPosition + 500, // add a 500ms gap by default
            track: 0
        });
        setIsLibraryOpen(false);
    };

    // Calculate total duration roughly
    const totalDurationMs = story.items.reduce((max: number, item: StoryItemResponse) => Math.max(max, item.position_ms + (item.generation?.duration_seconds || 0) * 1000), 0);

    return (
        <div className="page-container-xl h-[calc(100vh-100px)] flex flex-col">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-xl mb-4 shrink-0">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
                    <div>
                        <h2 className="font-black text-lg leading-none">{story.name}</h2>
                        <span className="text-xs text-slate-500 font-medium">Timeline Editor</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-sm font-mono text-slate-400 px-4 py-1 bg-slate-950 rounded-md border border-slate-800">
                        {Math.floor(totalDurationMs / 1000 / 60)}:{Math.floor((totalDurationMs / 1000) % 60).toString().padStart(2, '0')}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setIsLibraryOpen(true)}>
                        <ListMusic className="w-4 h-4 mr-2" /> Add Clip from History
                    </Button>
                    <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold border-2 border-slate-950 shadow-[2px_2px_0_#0f172a]">
                        <Share2 className="w-4 h-4 mr-2" /> Export Mix
                    </Button>
                </div>
            </div>

            {/* Timeline Workspace area */}
            <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden flex flex-col relative">

                {/* Track Headers */}
                <div className="w-full h-8 bg-slate-950/50 border-b border-slate-800 flex items-center px-4 shrink-0">
                    <div className="w-48 text-xs font-bold uppercase text-slate-500">Tracks</div>
                    <div className="flex-1 border-l border-slate-800 ml-4 relative h-full">
                        {/* Time markers every 10s */}
                        {[...Array(20)].map((_, i) => (
                            <div key={i} className="absolute h-full border-l border-slate-800/50" style={{ left: `${i * 100}px` }}>
                                <span className="absolute text-[10px] text-slate-600 top-2 -left-2">{i * 10}s</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Tracks Area (Scrollable) */}
                <div className="flex-1 overflow-auto p-4 space-y-4">
                    {/* Track 1 */}
                    <div className="flex h-24 bg-slate-900/80 rounded border border-slate-800">
                        <div className="w-48 bg-slate-950 p-4 border-r border-slate-800 flex flex-col justify-center">
                            <h4 className="font-bold text-sm">Dialogue Track</h4>
                            <span className="text-xs text-slate-500">Voice Generation</span>
                        </div>
                        <div className="flex-1 relative overflow-x-auto overflow-y-hidden bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAABZJREFUeNpi2rV7928bEAAAAAAA//8DCAAyAgQk5mSNAAAAAElFTkSuQmCC')] bg-repeat">
                            {story.items.filter((i: StoryItemResponse) => i.track === 0).map((item: StoryItemResponse) => {
                                const leftPx = (item.position_ms / 1000) * 10; // 10px per second scale
                                const widthPx = ((item.generation?.duration_seconds || 5) * 10);
                                return (
                                    <div
                                        key={item.id}
                                        className="absolute top-2 bottom-2 bg-blue-500/20 border-2 border-blue-500 rounded p-1 group flex flex-col cursor-move"
                                        style={{ left: `${leftPx}px`, width: `${widthPx}px`, minWidth: '40px' }}
                                        title={item.generation?.text}
                                    >
                                        <div className="text-[10px] font-bold text-blue-200 truncate pr-4">{item.generation?.voice_name}</div>
                                        <div className="text-[9px] text-blue-400 truncate opacity-70 mt-auto">{item.generation?.text}</div>
                                        <button
                                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded p-0.5"
                                            onClick={(e) => { e.stopPropagation(); deleteItem.mutate({ storyId, itemId: item.id }); }}
                                        >
                                            <Trash2 size={10} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Library Modal */}
            <Modal isOpen={isLibraryOpen} onClose={() => setIsLibraryOpen(false)} title="Select Clip from History" className="max-w-2xl">
                <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-2">
                    {history?.items?.length === 0 && <div className="text-center py-8 text-slate-500">No generations found in history.</div>}
                    {history?.items?.map(gen => (
                        <div key={gen.id} className="flex items-center justify-between p-3 bg-slate-900/50 border border-slate-800 rounded-lg hover:bg-slate-800 transition-colors">
                            <div className="flex-1 overflow-hidden pr-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold text-sm text-emerald-400">{gen.voice_name}</span>
                                    <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-400">{gen.duration_seconds}s</span>
                                </div>
                                <p className="text-xs text-slate-400 truncate">{gen.text}</p>
                            </div>
                            <Button size="sm" onClick={() => handleAddClip(gen.id)}>Add to Track</Button>
                        </div>
                    ))}
                </div>
            </Modal>
        </div>
    );
}
