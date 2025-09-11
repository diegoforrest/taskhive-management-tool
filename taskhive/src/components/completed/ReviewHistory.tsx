"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { tasksApi } from "@/lib/api";

export default function ReviewHistory({ projectId, allowAdd = true }: { projectId: number; allowAdd?: boolean }) {
  const [reviews, setReviews] = useState<Array<{ id: number; text: string; createdAt: string; reviewer: string }>>([]);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // fallback to tasksApi comments if no reviews endpoint present
        await tasksApi.getAllTasks();
        if (!mounted) return;
        // crude: treat task comments as reviews placeholder
        setReviews([]);
      } catch (err) {
        console.error('Failed to load reviews placeholder', err);
      }
    })();
    return () => { mounted = false; };
  }, [projectId]);

  const handleAdd = async () => {
    const newRev = { id: Date.now(), text, createdAt: new Date().toISOString(), reviewer: 'You' };
    setReviews(r => [newRev, ...r]);
    setText("");
    setOpen(false);
  };

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Review history</CardTitle>
        {allowAdd && <Button size="sm" onClick={() => setOpen(true)}>Add review</Button>}
      </CardHeader>
      <CardContent>
        {reviews.length === 0 ? (
          <div className="text-sm text-muted-foreground">No reviews yet</div>
        ) : (
          <ul className="space-y-3">
            {reviews.map(r => (
              <li key={r.id} className="border p-2 rounded">
                <div className="text-xs text-muted-foreground">{r.reviewer} • {new Date(r.createdAt).toLocaleString()}</div>
                <div className="mt-1">{r.text}</div>
              </li>
            ))}
          </ul>
        )}

        {allowAdd && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add review</DialogTitle>
              </DialogHeader>
              <div className="py-3">
                <textarea value={text} onChange={(e) => setText(e.target.value)} className="w-full min-h-[120px] p-2 border rounded" />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleAdd} disabled={!text.trim()}>Add</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}
