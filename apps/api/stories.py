"""
Resound Studio - Stories Module
================================
Business logic for managing multi-voice compositions (Timelines).
"""

from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException
from database import Story, StoryItem, Generation
from schemas import (
    StoryCreate, 
    StoryItemCreate, 
    StoryItemMove, 
    StoryItemTrim, 
    StoryResponse, 
    StoryItemResponse
)

def create_story(db: Session, data: StoryCreate):
    story = Story(name=data.name, description=data.description)
    db.add(story)
    db.commit()
    db.refresh(story)
    return get_story(db, story.id)

def get_stories(db: Session):
    return db.query(Story).order_by(Story.updated_at.desc()).all()

def get_story(db: Session, story_id: str):
    story = db.query(Story).filter(Story.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    # Get items and manually join generation data for the response
    items = db.query(StoryItem).filter(StoryItem.story_id == story_id).all()
    
    items_data = []
    for item in items:
        gen = db.query(Generation).filter(Generation.id == item.generation_id).first()
        item_dict = {
            "id": item.id,
            "story_id": item.story_id,
            "generation_id": item.generation_id,
            "position_ms": item.position_ms,
            "track": item.track,
            "trim_start_ms": item.trim_start_ms,
            "trim_end_ms": item.trim_end_ms,
            "created_at": item.created_at,
            "generation": gen
        }
        items_data.append(item_dict)
        
    return {
        "id": story.id,
        "name": story.name,
        "description": story.description,
        "created_at": story.created_at,
        "updated_at": story.updated_at,
        "items": items_data
    }

def delete_story(db: Session, story_id: str):
    story = db.query(Story).filter(Story.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
        
    db.query(StoryItem).filter(StoryItem.story_id == story_id).delete()
    db.delete(story)
    db.commit()

# ---- Story Items ----

def add_item_to_story(db: Session, story_id: str, data: StoryItemCreate):
    story = db.query(Story).filter(Story.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
        
    gen = db.query(Generation).filter(Generation.id == data.generation_id).first()
    if not gen:
        raise HTTPException(status_code=404, detail="Generation not found")

    item = StoryItem(
        story_id=story_id,
        generation_id=data.generation_id,
        position_ms=data.position_ms,
        track=data.track
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return get_story(db, story_id)

def move_story_item(db: Session, story_id: str, item_id: str, data: StoryItemMove):
    item = db.query(StoryItem).filter(StoryItem.id == item_id, StoryItem.story_id == story_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Story item not found")
        
    item.position_ms = data.position_ms
    if data.track is not None:
        item.track = data.track
        
    db.commit()
    return get_story(db, story_id)

def trim_story_item(db: Session, story_id: str, item_id: str, data: StoryItemTrim):
    item = db.query(StoryItem).filter(StoryItem.id == item_id, StoryItem.story_id == story_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Story item not found")
        
    item.trim_start_ms = data.trim_start_ms
    item.trim_end_ms = data.trim_end_ms
        
    db.commit()
    return get_story(db, story_id)

def delete_story_item(db: Session, story_id: str, item_id: str):
    item = db.query(StoryItem).filter(StoryItem.id == item_id, StoryItem.story_id == story_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Story item not found")
        
    db.delete(item)
    db.commit()
    return get_story(db, story_id)
