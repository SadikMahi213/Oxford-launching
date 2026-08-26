"""
Marketplace Demo Seed Script
Creates ~15 demo stores and ~180 products with realistic data.
Run: python seed_marketplace_demo.py
"""

import asyncio
import json
import random
from decimal import Decimal
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.models.seller import Seller
from app.models.product import Product

# ── Demo Stores ──────────────────────────────────────────────────────────────
DEMO_STORES = [
    {"store_name": "TechHub Bangladesh", "description": "Premium electronics and gadgets from top brands", "country": "Bangladesh", "division_state": "Dhaka", "district_city": "Dhaka", "full_address": "Gulshan-2, Dhaka 1212"},
    {"store_name": "Fashion Valley", "description": "Trendy clothing and accessories for everyone", "country": "Bangladesh", "division_state": "Dhaka", "district_city": "Dhaka", "full_address": "Banani, Dhaka 1213"},
    {"store_name": "Home essentials", "description": "Quality home appliances and kitchenware", "country": "Bangladesh", "division_state": "Dhaka", "district_city": "Dhaka", "full_address": "Uttara, Dhaka 1230"},
    {"store_name": "Gadget World", "description": "Latest smartphones, tablets and accessories", "country": "Bangladesh", "division_state": "Chittagong", "district_city": "Chittagong", "full_address": "Agrabad, Chittagong 4100"},
    {"store_name": "Style Studio", "description": "Premium fashion brands and designer wear", "country": "Bangladesh", "division_state": "Dhaka", "district_city": "Dhaka", "full_address": "Dhanmondi, Dhaka 1205"},
    {"store_name": "Kitchen Master", "description": "Professional kitchen appliances and cookware", "country": "Bangladesh", "division_state": "Rajshahi", "district_city": "Rajshahi", "full_address": "Boalia, Rajshahi 6205"},
    {"store_name": "Digital Store", "description": "Computers, laptops and IT peripherals", "country": "Bangladesh", "division_state": "Dhaka", "district_city": "Dhaka", "full_address": "Motijheel, Dhaka 1000"},
    {"store_name": "Beauty Corner", "description": "Skincare, makeup and beauty products", "country": "Bangladesh", "division_state": "Dhaka", "district_city": "Dhaka", "full_address": "Mirpur-10, Dhaka 1216"},
    {"store_name": "Sports Arena", "description": "Sports equipment, fitness gear and apparel", "country": "Bangladesh", "division_state": "Sylhet", "district_city": "Sylhet", "full_address": "Zindabazar, Sylhet 3100"},
    {"store_name": "Baby Care Plus", "description": "Everything for your baby - toys, clothes, essentials", "country": "Bangladesh", "division_state": "Dhaka", "district_city": "Dhaka", "full_address": "Bashundhara R/A, Dhaka 1229"},
    {"store_name": "Books & Beyond", "description": "Books, stationery and educational materials", "country": "Bangladesh", "division_state": "Dhaka", "district_city": "Dhaka", "full_address": "New Market, Dhaka 1205"},
    {"store_name": "Pet Paradise", "description": "Pet food, accessories and grooming supplies", "country": "Bangladesh", "division_state": "Dhaka", "district_city": "Dhaka", "full_address": "Khilgaon, Dhaka 1219"},
    {"store_name": "Auto Parts Hub", "description": "Automotive parts, tools and accessories", "country": "Bangladesh", "division_state": "Chittagong", "district_city": "Chittagong", "full_address": "Nasirabad, Chittagong 4206"},
    {"store_name": "Garden House", "description": "Plants, gardening tools and outdoor decor", "country": "Bangladesh", "division_state": "Dhaka", "district_city": "Dhaka", "full_address": "Baridhara, Dhaka 1212"},
    {"store_name": "Health First", "description": "Health supplements, vitamins and wellness products", "country": "Bangladesh", "division_state": "Dhaka", "district_city": "Dhaka", "full_address": "Farmgate, Dhaka 1215"},
]

# ── Product Templates by Category ────────────────────────────────────────────
PRODUCT_TEMPLATES = {
    "Electronics": [
        ("Samsung Galaxy S24 Ultra", "Latest flagship smartphone with S Pen", 159999, 149999, 10),
        ("iPhone 15 Pro Max", "Apple's most advanced iPhone", 179999, 169999, 8),
        ("OnePlus 12", "Flagship killer with Hasselblad camera", 89999, 84999, 12),
        ("Xiaomi 14", "Leica powered camera smartphone", 69999, 64999, 15),
        ("MacBook Air M3", "Thin and light laptop with M3 chip", 189999, 179999, 5),
        ("Dell XPS 15", "Premium ultrabook for professionals", 159999, 149999, 7),
        ("HP Pavilion 15", "Reliable laptop for everyday use", 79999, 74999, 20),
        ("ASUS ROG Strix G16", "Gaming laptop with RTX 4070", 199999, 189999, 4),
        ("iPad Pro 12.9 M2", "Most powerful iPad for creatives", 149999, 139999, 6),
        ("Samsung Galaxy Tab S9", "Android tablet with S Pen", 89999, 84999, 10),
        ("Sony WH-1000XM5", "Premium noise cancelling headphones", 49999, 44999, 18),
        ("AirPods Pro 2", "Apple's best in-ear earbuds", 34999, 32999, 25),
        ("JBL Charge 5", "Portable Bluetooth speaker", 19999, 17999, 30),
        ("Logitech MX Master 3S", "Wireless ergonomic mouse", 12999, 11999, 22),
        ("Canon EOS R50", "Mirrorless camera for content creators", 119999, 109999, 3),
        ("DJI Mini 4 Pro", "Compact drone with 4K camera", 99999, 94999, 4),
    ],
    "Fashion": [
        ("Levi's 501 Original Fit Jeans", "Classic straight leg denim", 5999, 5499, 50),
        ("Nike Air Max 270", "Iconic lifestyle sneakers", 14999, 13999, 25),
        ("Adidas Ultraboost 23", "Premium running shoes", 18999, 17999, 18),
        ("Polo Ralph Lauren Shirt", "Classic polo t-shirt", 8999, 8499, 30),
        ("Zara Summer Dress", "Elegant summer collection dress", 6999, 6499, 35),
        ("H&M Cotton T-Shirt Pack", "Pack of 3 basic cotton tees", 3999, 3499, 60),
        ("Ray-Ban Aviator Sunglasses", "Classic pilot style sunglasses", 15999, 14999, 12),
        ("Fossil Leather Belt", "Genuine leather casual belt", 4999, 4499, 40),
        ("Woodland Hiking Boots", "Durable outdoor boots", 12999, 11999, 15),
        ("Gucci Bloom Perfume", "Luxury fragrance for her", 25999, 24999, 8),
        ("Calvin Klein Underwear Set", "Premium cotton underwear", 3999, 3499, 45),
        ("Hermès Silk Scarf", "Luxury silk scarf", 49999, 47999, 2),
        ("Uniqlo Heattech T-Shirt", "Heat retention inner wear", 2499, 2299, 80),
        ("Tommy Hilfiger Jacket", "Casual bomber jacket", 14999, 13999, 10),
        ("Puma RS-X Sneakers", "Retro chunky sneakers", 11999, 10999, 20),
    ],
    "Home & Living": [
        ("Dyson V15 Detect", "Cordless vacuum with laser detect", 79999, 74999, 5),
        ("Philips Air Fryer XXL", "Premium air fryer with rapid air technology", 24999, 22999, 12),
        ("Xiaomi Robot Vacuum X10+", "Self-emptying robot vacuum", 59999, 54999, 7),
        ("Midea Washing Machine 8kg", "Front load fully automatic", 49999, 47999, 8),
        ("Samsung Refrigerator 308L", "Double door frost free", 69999, 64999, 4),
        ("Orient Electric Ceiling Fan", "High speed ceiling fan", 4999, 4499, 40),
        ("Vision TV 55 inch 4K", "Smart Android TV", 59999, 54999, 6),
        ("Whirlpool Microwave 25L", "Convection microwave oven", 19999, 18999, 10),
        ("Walton AC 1.5 Ton", "Inverter split AC", 64999, 59999, 5),
        ("GE Power Strip 6 Outlet", "Surge protector power strip", 2499, 2299, 50),
        ("Prestige Cooker Set", "Pressure cooker combo pack", 8999, 8499, 15),
        ("Nestle Water Purifier", "RO+UV water purifier", 29999, 27999, 8),
        ("V-Guard Stabilizer", "Voltage stabilizer for AC", 5999, 5499, 20),
        ("Symphony Desert Cooler", "Air cooler for large rooms", 14999, 13999, 12),
        ("Cello Thermos Flask", "Insulated steel flask", 2999, 2799, 30),
    ],
    "Beauty & Health": [
        ("The Ordinary Niacinamide 10%", "Serum for pores and oil control", 2999, 2799, 40),
        ("CeraVe Moisturizing Cream", "Daily face and body moisturizer", 3999, 3799, 35),
        ("La Roche-Posay Sunscreen SPF50", "Ultra light sun protection", 4999, 4799, 30),
        ("Maybelline Mascara", "Volume express waterproof", 1999, 1799, 50),
        ("L'Oreal Shampoo Set", "Anti hair fall shampoo + conditioner", 2499, 2299, 45),
        ("Neutrogena Face Wash", "Deep clean facial cleanser", 2499, 2299, 40),
        ("Vitamin C Serum 30ml", "Brightening face serum", 3499, 3299, 25),
        ("Gillette Fusion ProGlide Razor", "Premium shaving system", 2999, 2799, 35),
        ("Mamaearth Onion Hair Oil", "Hair fall control oil", 1499, 1299, 60),
        ("Wow Skin Science Aloe Gel", "Multipurpose aloe vera gel", 1299, 1199, 55),
        ("Bioderma Sensibio H2O", "Micellar water cleanser", 3999, 3799, 28),
        ("Olay Regenerist Cream", "Anti-aging moisturizer", 5999, 5499, 15),
    ],
    "Sports & Fitness": [
        ("Decathlon Yoga Mat 6mm", "Non-slip exercise mat", 2999, 2799, 40),
        ("Nike Dri-FIT T-Shirt", "Moisture-wicking sports tee", 4999, 4499, 30),
        ("Adjustable Dumbbell Set 20kg", "Home gym dumbbell pair", 14999, 13999, 12),
        ("Resistance Bands Set", "5 level exercise bands", 1999, 1799, 50),
        ("Protein Shaker Bottle", "BPA-free shaker 700ml", 999, 899, 80),
        ("Skipping Rope Speed", "Adjustable jump rope", 799, 699, 100),
        ("Running Belt Waist Bag", "Water resistant phone pouch", 1499, 1299, 35),
        ("Compression Socks 3 Pack", "Athletic recovery socks", 2499, 2299, 25),
        ("Table Tennis Racket Set", "Professional paddle + 3 balls", 3999, 3799, 18),
        ("Cricket Bat SS", "English willow cricket bat", 14999, 13999, 6),
        ("Football Size 5", "FIFA approved match ball", 3999, 3799, 20),
        ("Badminton Racket Yonex", "Lightweight carbon racket", 5999, 5499, 15),
    ],
    "Kids & Baby": [
        ("LEGO Classic Bricks 500pc", "Creative building set", 14999, 13999, 20),
        ("Hot Wheels Track Set", "Motorized track with 5 cars", 5999, 5499, 25),
        ("Barbie Dreamhouse", "3-story dollhouse playset", 24999, 22999, 8),
        ("Baby Diapers Pampers L 54pc", "Premium baby diapers", 3499, 3299, 60),
        ("Baby Stroller Lightweight", "Foldable travel stroller", 14999, 13999, 10),
        ("Kids Educational Tablet", "Learning tablet for ages 3-8", 12999, 11999, 15),
        ("Nursing Pillow U-Shape", "Comfortable feeding pillow", 3999, 3799, 30),
        ("Baby Car Seat ISOFIX", "Safety certified car seat", 19999, 18999, 7),
        ("Toy Kitchen Set", "Mini play kitchen for kids", 12999, 11999, 12),
        ("Children's Bicycle 16 inch", "Training wheels included", 14999, 13999, 10),
        ("Wooden Puzzle Set 4 Pack", "Educational jigsaw puzzles", 2999, 2799, 35),
        ("Baby Monitor Wireless", "Video monitor with night vision", 12999, 11999, 8),
    ],
    "Books & Stationery": [
        ("Atomic Habits by James Clear", "Bestselling self-help book", 1299, 1199, 50),
        ("Rich Dad Poor Dad", "Financial literacy classic", 1499, 1399, 45),
        ("IELTS Preparation Guide", "Complete IELTS prep book", 2499, 2299, 30),
        ("Sketching Pad A3 100 sheets", "Artist quality drawing pad", 1499, 1299, 40),
        ("Faber Castell Color Pencils 36", "Premium colored pencils", 2999, 2799, 35),
        ("Pilot G2 Pen Set (10)", "Smooth gel ink pens", 1999, 1799, 60),
        ("Oxford Dictionary", "Comprehensive English dictionary", 3499, 3299, 20),
        ("Moleskine Notebook Large", "Classic hardcover notebook", 4999, 4799, 18),
        ("Scientific Calculator Casio", "FX-991EX engineering calc", 3999, 3799, 25),
        ("Whiteboard 4x3 ft", "Magnetic dry erase board", 5999, 5499, 10),
    ],
    "Office Supplies": [
        ("HP LaserJet Printer", "Wireless mono laser printer", 29999, 27999, 5),
        ("Standing Desk Adjustable", "Electric height adjustable desk", 49999, 47999, 3),
        ("Ergonomic Office Chair", "Lumbar support mesh chair", 24999, 22999, 8),
        ("Paper Shredder 12 Sheet", "Cross cut confidential shredder", 14999, 13999, 10),
        ("Label Maker Brother", "Portable labeling machine", 12999, 11999, 7),
        ("Monitor Stand Riser", "Adjustable aluminum stand", 4999, 4799, 25),
        ("Webcam Logitech C920", "1080p HD webcam", 12999, 11999, 12),
        ("Wireless Keyboard Mouse Combo", "Logitech MK270 set", 5999, 5499, 30),
    ],
    "Automotive": [
        ("Car Phone Mount", "Magnetic dashboard holder", 1499, 1299, 50),
        ("Dash Cam 4K WiFi", "Front and rear camera", 19999, 18999, 8),
        ("Car Vacuum Cleaner", "12V portable vacuum", 5999, 5499, 20),
        ("Tire Pressure Gauge Digital", "Portable TPMS sensor", 2999, 2799, 30),
        ("Jump Starter Power Bank", "12V car jump starter", 14999, 13999, 10),
        ("Car Seat Cover Full Set", "Leather waterproof covers", 14999, 13999, 12),
        ("Car Air Freshener Set", "Natural bamboo charcoal", 1499, 1299, 60),
        ("OBD2 Scanner Bluetooth", "Car diagnostic tool", 5999, 5499, 15),
    ],
    "Pet Supplies": [
        ("Dry Cat Food 5kg", "Premium chicken formula", 4999, 4799, 25),
        ("Dog Leash Retractable", "16ft tangle-free leash", 2999, 2799, 30),
        ("Pet Bed Orthopedic", "Memory foam dog bed", 12999, 11999, 10),
        ("Cat Litter Box Self-Cleaning", "Automatic raking system", 24999, 22999, 5),
        ("Dog Shampoo Oatmeal", "Gentle sensitive skin formula", 1999, 1799, 40),
        ("Bird Cage Large", "Multi-level parrot cage", 14999, 13999, 8),
        ("Fish Tank Filter 200L", "Quiet external canister filter", 9999, 9499, 12),
        ("Pet Carrier Airline Approved", "Soft-sided travel carrier", 12999, 11999, 10),
    ],
    "Garden & Outdoor": [
        ("Garden Hose 30m", "Expandable water hose", 4999, 4799, 20),
        ("Solar Garden Lights (10)", "LED decorative path lights", 5999, 5499, 18),
        ("Lawn Mower Electric", "Cordless rechargeable mower", 24999, 22999, 6),
        ("Plant Pots Set (5)", "Ceramic decorative pots", 5999, 5499, 15),
        ("Pruning Shears Professional", "Bypass garden scissors", 2999, 2799, 30),
        ("Compost Bin 30L", "Outdoor composting tumbler", 9999, 9499, 10),
        ("Sprinkler System Auto", "Programmable garden sprinkler", 7999, 7499, 12),
        ("Outdoor Furniture Set", "4 seater patio table and chairs", 49999, 47999, 3),
    ],
    "Kitchen": [
        ("Air Fryer Oven Large", "17L digital air fryer oven", 24999, 22999, 8),
        ("Blender Mixer Grinder", "750W 3-in-1 kitchen blender", 8999, 8499, 20),
        ("Non-Stick Cookware Set", "10 piece PFOA free set", 12999, 11999, 12),
        ("Electric Kettle 2L", "Double wall insulated", 4999, 4799, 25),
        ("Rice Cooker 5 Cup", "Fuzzy logic technology", 7999, 7499, 15),
        ("Food Processor 1000W", "Multi-function chopper", 14999, 13999, 10),
        ("Knife Set 8 Piece", "German steel knife block set", 14999, 13999, 8),
        ("Toaster 4 Slice", "Brushed stainless steel", 8999, 8499, 15),
        ("Espresso Machine", "Semi-automatic coffee maker", 49999, 47999, 4),
        ("Blender Portable USB", "Personal travel blender", 2999, 2799, 40),
    ],
}

# Store-category mapping (which stores sell which categories)
STORE_CATEGORIES = {
    0: ["Electronics"],  # TechHub Bangladesh
    1: ["Fashion"],  # Fashion Valley
    2: ["Home & Living", "Kitchen"],  # Home essentials
    3: ["Electronics"],  # Gadget World
    4: ["Fashion"],  # Style Studio
    5: ["Kitchen", "Home & Living"],  # Kitchen Master
    6: ["Electronics"],  # Digital Store
    7: ["Beauty & Health"],  # Beauty Corner
    8: ["Sports & Fitness"],  # Sports Arena
    9: ["Kids & Baby"],  # Baby Care Plus
    10: ["Books & Stationery", "Office Supplies"],  # Books & Beyond
    11: ["Pet Supplies"],  # Pet Paradise
    12: ["Automotive"],  # Auto Parts Hub
    13: ["Garden & Outdoor"],  # Garden House
    14: ["Beauty & Health", "Health & Wellness"],  # Health First
}

# Placeholder images (using picsum for product images)
PLACEHOLDER_IMAGES = [
    "https://picsum.photos/seed/{seed}/800/800",
]

def get_placeholder_image(product_name: str, idx: int) -> str:
    """Generate a deterministic placeholder image URL."""
    seed = f"{product_name.replace(' ', '-')}-{idx}".lower()
    return f"https://picsum.photos/seed/{seed}/800/800"


async def seed_marketplace():
    async with AsyncSessionLocal() as db:
        # Check existing sellers
        result = await db.execute(select(func.count(Seller.id)))
        existing_sellers = result.scalar() or 0
        if existing_sellers > 10:
            print(f"Found {existing_sellers} existing sellers. Use --force to re-seed.")
            return

        # Get existing user IDs (we need valid user_ids for sellers)
        result = await db.execute(select(User.id).order_by(User.id).limit(20))
        user_ids = [row[0] for row in result.all()]
        if not user_ids:
            print("No users found in database. Create users first.")
            return

        print(f"Found {len(user_ids)} users. Creating sellers...")

        # Create sellers
        sellers = []
        for i, store_data in enumerate(DEMO_STORES):
            # Reuse user IDs cyclically if we have fewer users than stores
            user_id = user_ids[i % len(user_ids)]

            # Check if seller already exists for this user
            existing = await db.execute(
                select(Seller).where(Seller.user_id == user_id, Seller.store_name == store_data["store_name"])
            )
            if existing.scalar_one_or_none():
                print(f"  Store '{store_data['store_name']}' already exists, skipping...")
                continue

            seller = Seller(
                user_id=user_id,
                store_name=store_data["store_name"],
                description=store_data["description"],
                status="approved",
                country=store_data["country"],
                division_state=store_data["division_state"],
                district_city=store_data["district_city"],
                full_address=store_data["full_address"],
                profile_completion=Decimal("100.00"),
            )
            db.add(seller)
            await db.flush()
            sellers.append((len(sellers) + 1, store_data["store_name"], i))
            print(f"  Created store: {store_data['store_name']}")

        await db.commit()

        # Get all sellers (including pre-existing ones)
        result = await db.execute(select(Seller).where(Seller.status == "approved"))
        all_sellers = result.scalars().all()
        seller_map = {s.store_name: s.id for s in all_sellers}

        print(f"\nTotal approved sellers: {len(seller_map)}")

        # Create products
        product_count = 0
        for store_idx, store_data in enumerate(DEMO_STORES):
            store_name = store_data["store_name"]
            if store_name not in seller_map:
                print(f"  Skipping store {store_name} - not found in DB")
                continue

            seller_id = seller_map[store_name]
            categories = STORE_CATEGORIES.get(store_idx, [])

            for category in categories:
                templates = PRODUCT_TEMPLATES.get(category, [])
                for tpl in templates:
                    name, description, price, discount_price, stock = tpl

                    # Skip if product already exists
                    existing = await db.execute(
                        select(Product).where(Product.seller_id == seller_id, Product.name == name)
                    )
                    if existing.scalar_one_or_none():
                        continue

                    # Convert BDT to USD (approximate: 1 USD ≈ 110 BDT)
                    price_usd = round(price / 110, 2)
                    discount_usd = round(discount_price / 110, 2)

                    # Create product with image URLs
                    image_url = get_placeholder_image(name, 0)
                    image_urls = json.dumps([get_placeholder_image(name, i) for i in range(3)])

                    product = Product(
                        seller_id=seller_id,
                        name=name,
                        description=description,
                        price=Decimal(str(price_usd)),
                        discount_price=Decimal(str(discount_usd)),
                        image_url=image_url,
                        image_urls=image_urls,
                        category=category,
                        stock_quantity=stock,
                        is_active=True,
                        sku=f"DEMO-{category[:3].upper()}-{product_count:04d}",
                        shipping_info="Free shipping on orders over $50",
                    )
                    db.add(product)
                    product_count += 1

                    if product_count % 20 == 0:
                        await db.flush()
                        print(f"  Created {product_count} products...")

        await db.commit()
        print(f"\n✅ Seeded {product_count} products across {len(seller_map)} stores")


if __name__ == "__main__":
    asyncio.run(seed_marketplace())
