"use client";

import React, { useState, useEffect } from "react";
import { Headphones, Plus, Trash2, Save, Loader2 } from "lucide-react";
import { Button, Input } from "@resound-studio/ui";
import { useChannels, useCreateChannel, useUpdateChannel, useDeleteChannel } from "@/hooks/api/useChannels";
import { useAudioRoutingStore } from "@/stores/useAudioRoutingStore";
import type { AudioChannel } from "@resound-studio/shared";

export default function AudioChannelsPage() {
    const { data: channels = [], isLoading } = useChannels();
    const createChannel = useCreateChannel();
    const updateChannel = useUpdateChannel();
    const deleteChannel = useDeleteChannel();

    const { deviceMappings, setDeviceMapping } = useAudioRoutingStore();
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

    const [newChannelName, setNewChannelName] = useState("");

    // Fetch available audio output devices
    useEffect(() => {
        const getDevices = async () => {
            try {
                await navigator.mediaDevices.getUserMedia({ audio: true }); // Request permission to see labels
                const allDevices = await navigator.mediaDevices.enumerateDevices();
                const audioOutputs = allDevices.filter(d => d.kind === "audiooutput");
                setDevices(audioOutputs);
            } catch (error) {
                console.error("Failed to list audio devices:", error);
            }
        };
        getDevices();
    }, []);

    const handleCreate = async () => {
        if (!newChannelName.trim()) return;
        await createChannel.mutateAsync({ name: newChannelName });
        setNewChannelName("");
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Delete this audio channel? Profiles using it will fallback to Default.")) {
            await deleteChannel.mutateAsync(id);
        }
    };

    const handleMapDevice = (channelId: string, sinkId: string) => {
        setDeviceMapping(channelId, sinkId);
    };

    return (
        <div className="page-container-md">
            {/* Header */}
            <div className="page-hero" style={{ marginBottom: "32px" }}>
                <div style={{ width: 56, height: 56, background: "var(--accent-amber)", border: "var(--border-thick)", boxShadow: "4px 4px 0px #000", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Headphones size={26} color="black" strokeWidth={3} />
                </div>
                <div>
                    <h1 style={{ fontSize: "1.75rem", fontWeight: 900 }}>Audio Routing</h1>
                    <p style={{ fontWeight: 600 }}>Create logical audio channels and map them to physical devices.</p>
                </div>
            </div>

            {/* Create New Channel */}
            <div className="glass-card" style={{ marginBottom: "32px", padding: "24px" }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "16px" }}>Add New Channel</h2>
                <div className="flex gap-4">
                    <div style={{ flex: 1 }}>
                        <Input
                            placeholder="Channel Name (e.g. Stream Output, Discord, Voicemeeter Aux)"
                            value={newChannelName}
                            onChange={(e) => setNewChannelName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                        />
                    </div>
                    <Button onClick={handleCreate} disabled={createChannel.isPending || !newChannelName.trim()}>
                        {createChannel.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
                        Create
                    </Button>
                </div>
            </div>

            {/* Existing Channels */}
            <div className="glass-card" style={{ padding: "24px" }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "24px" }}>Configured Channels</h2>

                {isLoading ? (
                    <div className="flex justify-center p-8"><Loader2 className="animate-spin w-8 h-8 text-[var(--accent-amber)]" /></div>
                ) : channels.length === 0 ? (
                    <div className="text-center p-8 text-gray-500 font-bold">No custom audio channels created yet.</div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {channels.map((channel: AudioChannel) => {
                            const currentSinkId = deviceMappings[channel.id] || "default";

                            return (
                                <div key={channel.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border-2 border-dashed border-black rounded-lg gap-4" style={{ background: "rgba(255,255,255,0.5)" }}>
                                    <div>
                                        <h3 style={{ fontSize: "1.1rem", fontWeight: 800 }}>{channel.name}</h3>
                                        <p style={{ fontSize: "0.8rem", fontFamily: "monospace", color: "#666" }}>ID: {channel.id}</p>
                                    </div>

                                    <div className="flex items-center gap-4 w-full md:w-auto">
                                        <div className="flex-1 md:w-[300px]">
                                            <select
                                                value={currentSinkId}
                                                onChange={(e) => handleMapDevice(channel.id, e.target.value)}
                                                className="w-full"
                                                style={{
                                                    padding: "8px 12px",
                                                    border: "var(--border-thin)",
                                                    borderRadius: "4px",
                                                    background: "white",
                                                    fontWeight: 600,
                                                    fontSize: "0.9rem"
                                                }}
                                            >
                                                <option value="default">System Default</option>
                                                {devices.map(d => (
                                                    <option key={d.deviceId} value={d.deviceId}>{d.label || `Device ${d.deviceId.slice(0, 5)}...`}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <Button variant="danger" onClick={() => handleDelete(channel.id)} disabled={deleteChannel.isPending}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Guide */}
            <div className="mt-8 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <h3 className="font-bold text-blue-800 mb-2">How Audio Routing Works</h3>
                <ul className="text-sm text-blue-900 list-disc ml-4 space-y-1">
                    <li>Create logical channels (e.g. "Stream", "Headphones")</li>
                    <li>Map each channel to a physical output device on this PC</li>
                    <li>Assign Voice Profiles to these logical channels</li>
                    <li>Audio generated by that voice will automatically play out the mapped physical device</li>
                </ul>
            </div>
        </div>
    );
}
