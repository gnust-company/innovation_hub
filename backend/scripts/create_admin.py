#!/usr/bin/env python3
"""Script to create admin user using SQLAlchemy ORM."""
import asyncio
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.core.config import get_settings
from app.infrastructure.database.models import *  # noqa: F401, F403 — register all mappers
from app.infrastructure.database.models.user_model import UserModel
from app.infrastructure.security.password import PasswordHasher


async def create_admin(
    username: str = "admin",
    password: str = "abc13579",
    email: str = "admin@samsung.com",
    full_name: str = "Administrator"
) -> bool:
    """Create admin user in database using ORM.
    
    Args:
        username: Admin username
        password: Admin password (plain text, will be hashed)
        email: Admin email
        full_name: Admin full name
        
    Returns:
        True if created successfully, False otherwise
    """
    settings = get_settings()
    
    # Create engine and session
    engine = create_async_engine(
        str(settings.database_url),
        echo=False  # Set to True for debugging
    )
    async_session_factory = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False
    )
    
    # Hash password
    password_hasher = PasswordHasher()
    password_hash = password_hasher.hash(password)
    
    async with async_session_factory() as session:
        try:
            # Check if admin already exists
            result = await session.execute(
                select(UserModel).where(UserModel.username == username)
            )
            existing_user = result.scalar_one_or_none()
            
            if existing_user:
                print(f"❌ User '{username}' already exists!")
                print(f"   ID: {existing_user.id}")
                print(f"   Email: {existing_user.email}")
                return False
            
            # Create new admin user using ORM
            # ORM will automatically handle: id (uuid4), created_at (now), updated_at
            admin_user = UserModel(
                username=username,
                password_hash=password_hash,
                email=email,
                full_name=full_name,
                role="admin",
                is_active=True
            )
            
            session.add(admin_user)
            await session.commit()
            await session.refresh(admin_user)
            
            print(f"✅ Admin user created successfully!")
            print(f"   ID: {admin_user.id}")
            print(f"   Username: {username}")
            print(f"   Password: {password}")
            print(f"   Email: {email}")
            print(f"   Role: {admin_user.role}")
            return True
            
        except Exception as e:
            print(f"❌ Error creating admin: {e}")
            await session.rollback()
            return False
        finally:
            await engine.dispose()


async def list_admins() -> None:
    """List all admin users in database."""
    settings = get_settings()
    
    engine = create_async_engine(
        str(settings.database_url),
        echo=False
    )
    async_session_factory = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False
    )
    
    async with async_session_factory() as session:
        try:
            result = await session.execute(
                select(UserModel).where(UserModel.role == "admin")
            )
            admins = result.scalars().all()
            
            if not admins:
                print("No admin users found.")
                return
            
            print(f"\n📋 Found {len(admins)} admin user(s):")
            print("-" * 60)
            for admin in admins:
                status = "✅ Active" if admin.is_active else "❌ Inactive"
                print(f"   ID: {admin.id}")
                print(f"   Username: {admin.username}")
                print(f"   Email: {admin.email}")
                print(f"   Full Name: {admin.full_name}")
                print(f"   Status: {status}")
                print(f"   Created: {admin.created_at}")
                print("-" * 60)
                
        finally:
            await engine.dispose()


def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Manage admin users for Innovation Hub",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Create default admin
  python scripts/create_admin.py
  
  # Create custom admin
  python scripts/create_admin.py --username myadmin --password mypass123
  
  # List all admins
  python scripts/create_admin.py --list
        """
    )
    
    parser.add_argument(
        "--username", 
        default="admin", 
        help="Admin username (default: admin)"
    )
    parser.add_argument(
        "--password", 
        default="abc13579", 
        help="Admin password (default: abc13579)"
    )
    parser.add_argument(
        "--email", 
        default="admin@samsung.com", 
        help="Admin email (default: admin@samsung.com)"
    )
    parser.add_argument(
        "--full-name", 
        default="Administrator", 
        help="Admin full name (default: Administrator)"
    )
    parser.add_argument(
        "--list", 
        action="store_true",
        help="List all admin users instead of creating"
    )
    
    args = parser.parse_args()
    
    if args.list:
        asyncio.run(list_admins())
    else:
        asyncio.run(create_admin(
            username=args.username,
            password=args.password,
            email=args.email,
            full_name=args.full_name
        ))


if __name__ == "__main__":
    main()