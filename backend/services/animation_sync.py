"""
Animation Sync Layer — manages beat-level synchronization for audio + animation + subtitles.

Ensures perfect timing across all media streams.
"""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass, asdict
from typing import Optional

logger = logging.getLogger("services.animation_sync")


@dataclass
class Beat:
    """Single animation beat with narration and timing."""
    time: float  # seconds from start
    action: str  # what happens
    objects: str  # what's shown
    camera: str  # camera movement
    narration: str  # what's said
    subtitle: str  # subtitle text (may differ from narration)


@dataclass
class AnimationSyncMap:
    """Master sync map for a complete animation or animation part."""
    animation_id: str  # unique ID for this animation
    total_duration: float  # seconds
    beats: list[Beat]  # all beats in sequence
    narration_text: str  # full narration (for TTS)
    part_number: int = 1
    total_parts: int = 1

    def to_dict(self) -> dict:
        return {
            "animation_id": self.animation_id,
            "total_duration": self.total_duration,
            "beats": [asdict(b) for b in self.beats],
            "narration_text": self.narration_text,
            "part_number": self.part_number,
            "total_parts": self.total_parts,
        }

    @staticmethod
    def from_storyboard(storyboard: dict, animation_id: str, part: int = 1, total_parts: int = 1) -> AnimationSyncMap:
        """Extract sync map from generated storyboard."""
        beats = []
        for beat_data in storyboard.get("beats", []):
            beat = Beat(
                time=float(beat_data.get("time", 0)),
                action=beat_data.get("action", ""),
                objects=beat_data.get("objects", ""),
                camera=beat_data.get("camera", ""),
                narration=beat_data.get("narration", ""),
                subtitle=beat_data.get("subtitle", beat_data.get("narration", "")),
            )
            beats.append(beat)

        narration = " ".join(b.narration for b in beats if b.narration)
        duration = float(storyboard.get("duration", max(b.time for b in beats) + 2 if beats else 14))

        return AnimationSyncMap(
            animation_id=animation_id,
            total_duration=duration,
            beats=beats,
            narration_text=narration,
            part_number=part,
            total_parts=total_parts,
        )


def interpolate_subtitle(beats: list[Beat], current_time: float) -> Optional[str]:
    """Get subtitle text active at current_time."""
    active = None
    for beat in beats:
        if beat.time <= current_time:
            active = beat.subtitle
        else:
            break
    return active


def get_next_beat(beats: list[Beat], current_time: float) -> Optional[Beat]:
    """Get the next beat after current_time."""
    for beat in beats:
        if beat.time > current_time:
            return beat
    return None
