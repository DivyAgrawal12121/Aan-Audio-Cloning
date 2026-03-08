"""
Resound Studio - Audio Channels Module
======================================
Business logic for managing Audio Channels.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.orm import Session

from database import AudioChannel, get_db
import schemas

router = APIRouter(prefix="/api/channels", tags=["Audio Channels"])

@router.get("", response_model=List[schemas.AudioChannelResponse])
def get_channels(db: Session = Depends(get_db)):
    return db.query(AudioChannel).order_by(AudioChannel.created_at.desc()).all()


@router.post("", response_model=schemas.AudioChannelResponse, status_code=status.HTTP_201_CREATED)
def create_channel(channel: schemas.AudioChannelCreate, db: Session = Depends(get_db)):
    db_channel = AudioChannel(
        name=channel.name,
        color=channel.color
    )
    db.add(db_channel)
    db.commit()
    db.refresh(db_channel)
    return db_channel


@router.patch("/{channel_id}", response_model=schemas.AudioChannelResponse)
def update_channel(channel_id: str, updates: schemas.AudioChannelUpdate, db: Session = Depends(get_db)):
    db_channel = db.query(AudioChannel).filter(AudioChannel.id == channel_id).first()
    if not db_channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    update_data = updates.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_channel, key, value)
        
    db.commit()
    db.refresh(db_channel)
    return db_channel


@router.delete("/{channel_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_channel(channel_id: str, db: Session = Depends(get_db)):
    db_channel = db.query(AudioChannel).filter(AudioChannel.id == channel_id).first()
    if not db_channel:
        raise HTTPException(status_code=404, detail="Channel not found")
        
    # Unlink any voice profiles using this channel
    from database import VoiceProfile
    profiles = db.query(VoiceProfile).filter(VoiceProfile.channel_id == channel_id).all()
    for profile in profiles:
        profile.channel_id = None
        
    db.delete(db_channel)
    db.commit()
