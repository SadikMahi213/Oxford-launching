"""
Marketplace Demo Seed Script
Creates ~15 demo stores and ~180 products with realistic data.
Fixes existing products with missing descriptions or broken images.

Usage:
    python seed_marketplace_demo.py              # seed new products only
    python seed_marketplace_demo.py --force      # also fix existing products with NULL/broken data
"""

import asyncio
import json
import sys
import argparse
from decimal import Decimal
from urllib.parse import quote
from sqlalchemy import select, func, or_
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
# Each tuple: (name, description, price_bdt, discount_price_bdt, stock)
PRODUCT_TEMPLATES = {
    "Electronics": [
        ("Samsung Galaxy S24 Ultra", "Samsung Galaxy S24 Ultra flagship smartphone with built-in S Pen, 200MP camera, Snapdragon 8 Gen 3 processor, 6.8-inch Dynamic AMOLED display, 5000mAh battery, and titanium frame. Water and dust resistant with IP68 rating.", 159999, 149999, 10),
        ("iPhone 15 Pro Max", "Apple iPhone 15 Pro Max with A17 Pro chip, 48MP camera system, titanium design, Action button, USB-C connectivity, and all-day battery life. Features a 6.7-inch Super Retina XDR display with ProMotion technology.", 179999, 169999, 8),
        ("OnePlus 12", "OnePlus 12 flagship smartphone with Hasselblad-tuned triple camera system, Snapdragon 8 Gen 3, 6.82-inch 2K LTPO AMOLED display with 120Hz refresh rate, 5400mAh battery with 100W SUPERVOOC fast charging.", 89999, 84999, 12),
        ("Xiaomi 14", "Xiaomi 14 premium smartphone with Leica optics, 50MP main sensor, Snapdragon 8 Gen 3, 6.36-inch LTPO AMOLED display, 90W hyper charge, and compact form factor for one-hand use.", 69999, 64999, 15),
        ("MacBook Air M3", "Apple MacBook Air 13-inch with M3 chip, 8-core CPU and 10-core GPU, 16GB unified memory, 256GB SSD storage, stunning Liquid Retina display, 18-hour battery life, and fanless design in a thin and light body.", 189999, 179999, 5),
        ("Dell XPS 15", "Dell XPS 15 premium ultrabook with 13th Gen Intel Core i7, 16GB RAM, 512GB SSD, 15.6-inch 3.5K OLED InfinityEdge display, backlit keyboard, and Thunderbolt 4 connectivity for professionals.", 159999, 149999, 7),
        ("HP Pavilion 15", "HP Pavilion 15 reliable everyday laptop with 13th Gen Intel Core i5, 8GB RAM, 512GB SSD, 15.6-inch Full HD IPS display, B&O audio, and long-lasting battery for work and study.", 79999, 74999, 20),
        ("ASUS ROG Strix G16", "ASUS ROG Strix G16 gaming laptop with Intel Core i9, NVIDIA RTX 4070, 16GB DDR5 RAM, 1TB SSD, 16-inch QHD 165Hz display, per-key RGB keyboard, and advanced cooling system for serious gamers.", 199999, 189999, 4),
        ("iPad Pro 12.9 M2", "Apple iPad Pro 12.9-inch with M2 chip, Liquid Retina XDR display, ProMotion technology, 12MP wide and 10MP ultra-wide cameras, Face ID, Thunderbolt/USB 4 port, and support for Apple Pencil hover.", 149999, 139999, 6),
        ("Samsung Galaxy Tab S9", "Samsung Galaxy Tab S9 Android tablet with S Pen included, Snapdragon 8 Gen 2, 11-inch Dynamic AMOLED 2X display, IP68 water resistance, 8400mAh battery, and Samsung DeX support.", 89999, 84999, 10),
        ("Sony WH-1000XM5", "Sony WH-1000XM5 industry-leading noise cancelling headphones with Auto NC Optimizer, 30-hour battery life, multipoint connection, speak-to-chat, and LDAC Hi-Res Audio support.", 49999, 44999, 18),
        ("AirPods Pro 2", "Apple AirPods Pro 2nd generation with adaptive transparency, personalized spatial audio, up to 2x more noise cancellation, USB-C charging, touch volume control, and IP54 dust and water resistance.", 34999, 32999, 25),
        ("JBL Charge 5", "JBL Charge 5 portable Bluetooth speaker with powerful JBL Pro Sound, IP67 waterproof and dustproof rating, 20 hours of playtime, built-in power bank, and JBL PartyBoost for linking multiple speakers.", 19999, 17999, 30),
        ("Logitech MX Master 3S", "Logitech MX Master 3S wireless ergonomic mouse with 8K DPI sensor, quiet clicks, MagSpeed electromagnetic scroll wheel, USB-C quick charging, Flow cross-computer control, and comfortable hand-sculpted design.", 12999, 11999, 22),
        ("Canon EOS R50", "Canon EOS R50 mirrorless camera with 24.2MP APS-C CMOS sensor, 4K 30p video, Dual Pixel CMOS AF II, 15fps continuous shooting, vari-angle touchscreen, and built-in Wi-Fi and Bluetooth for content creators.", 119999, 109999, 3),
        ("DJI Mini 4 Pro", "DJI Mini 4 Pro compact drone with 4K/60fps HDR video, 48MP photos, omnidirectional obstacle sensing, 34-min max flight time, ActiveTrack 360, and Under 249g weight for registration-free flying.", 99999, 94999, 4),
    ],
    "Fashion": [
        ("Levi's 501 Original Fit Jeans", "Levi's 501 Original Fit straight-leg jeans in authentic indigo denim with the signature button fly. Classic five-pocket styling, timeless silhouette, and durable construction for everyday wear.", 5999, 5499, 50),
        ("Nike Air Max 270", "Nike Air Max 270 lifestyle sneakers with the largest Max Air unit yet, lightweight mesh upper, rubber outsole with waffle pattern, and plush foam midsole for all-day comfort.", 14999, 13999, 25),
        ("Adidas Ultraboost 23", "Adidas Ultraboost 23 premium running shoes with BOOST midsole, Primeknit+ upper, Continental rubber outsole, Torsion Spring for energy return, and responsive cushioning for marathon-level performance.", 18999, 17999, 18),
        ("Polo Ralph Lauren Shirt", "Polo Ralph Lauren classic cotton polo shirt with embroidered pony logo, ribbed collar and cuffs, two-button placket, side vents, and a regular fit that transitions from casual to smart effortlessly.", 8999, 8499, 30),
        ("Zara Summer Dress", "Zara elegant summer collection dress in lightweight woven fabric with floral print, adjustable spaghetti straps, midi length, side pockets, and a flattering A-line silhouette for warm weather occasions.", 6999, 6499, 35),
        ("H&M Cotton T-Shirt Pack", "H&M pack of 3 basic crew-neck T-shirts in 100% combed cotton, soft and breathable fabric, regular fit, ribbed neckline, and durable stitching. Available in black, white, and grey.", 3999, 3499, 60),
        ("Ray-Ban Aviator Sunglasses", "Ray-Ban Aviator Classic pilot-style sunglasses with crystal green lenses, gold-tone metal frame, UV protection, and adjustable nose pads. Iconic design since 1937.", 15999, 14999, 12),
        ("Fossil Leather Belt", "Fossil genuine leather casual belt with brushed nickel buckle, 35mm width, reversible design with brown and black sides, and classic construction that ages beautifully over time.", 4999, 4499, 40),
        ("Woodland Hiking Boots", "Woodland durable leather hiking boots with waterproof construction, cushioned insole, rubber lug outsole for superior traction, padded collar and tongue, and ankle support for outdoor adventures.", 12999, 11999, 15),
        ("Gucci Bloom Perfume", "Gucci Bloom Eau de Parfum for her with natural tuberose, jasmine bud, and Rangoon creeper in a vintage-inspired floral bottle. A rich white floral fragrance that blooms on the skin.", 25999, 24999, 8),
        ("Calvin Klein Underwear Set", "Calvin Klein premium cotton stretch underwear set with iconic waistband logo, breathable microfiber fabric, tagless design, and a comfortable modern fit in a gift-ready box.", 3999, 3499, 45),
        ("Hermès Silk Scarf", "Hermès 100% mulberry silk twill scarf with hand-rolled edges, vibrant artistic print, and luxury finishing. A timeless accessory that adds elegance to any outfit.", 49999, 47999, 2),
        ("Uniqlo Heattech T-Shirt", "Uniqlo Heattech inner wear T-shirt with heat-generating fabric technology, moisture-wicking properties, ultra-thin stretch material, and quick-drying function for cold weather layering.", 2499, 2299, 80),
        ("Tommy Hilfiger Jacket", "Tommy Hilfiger casual bomber jacket in lightweight nylon with ribbed collar, cuffs, and hem, zip-front closure, side pockets, and classic Americana styling for transitional weather.", 14999, 13999, 10),
        ("Puma RS-X Sneakers", "Puma RS-X retro chunky sneakers with bold colorway, RS foam cushioning, mesh and synthetic upper, rubber outsole, and oversized design inspired by 1980s running technology.", 11999, 10999, 20),
    ],
    "Home & Living": [
        ("Dyson V15 Detect", "Dyson V15 Detect cordless vacuum with laser dust detection, piezo sensor for particle counting, HEPA filtration, 60 minutes runtime, and intelligent suction that auto-adjusts to floor type.", 79999, 74999, 5),
        ("Philips Air Fryer XXL", "Philips Premium Airfryer XXL with Rapid Air Technology, Fat Removal technology, digital touchscreen, XXL capacity for 6 portions, 7 preset cooking functions, and dishwasher-safe parts.", 24999, 22999, 12),
        ("Xiaomi Robot Vacuum X10+", "Xiaomi Robot Vacuum X10+ with LDS laser navigation, AI object recognition, self-emptying dock, 4000Pa suction power, 150-min runtime, and support for mopping and vacuuming simultaneously.", 59999, 54999, 7),
        ("Midea Washing Machine 8kg", "Midea 8kg front-load fully automatic washing machine with inverter motor, 1400 RPM spin speed, steam wash function, 15 wash programs, LED display, and energy-efficient operation.", 49999, 47999, 8),
        ("Samsung Refrigerator 308L", "Samsung 308L double-door frost-free refrigerator with Digital Inverter, Twin Cooling Plus, Convertible Freezer, Smart Connect Inverter, and energy-efficient operation for modern kitchens.", 69999, 64999, 4),
        ("Orient Electric Ceiling Fan", "Orient Electric high-speed ceiling fan with powerful motor delivering 390 RPM, aerodynamic blade design, double ball bearing, decorative finish, and low power consumption.", 4999, 4499, 40),
        ("Vision TV 55 inch 4K", "Vision 55-inch 4K Ultra HD Smart Android TV with Dolby Vision, HDR10, built-in Chromecast, Google Assistant, 60Hz refresh rate, and slim bezel design for immersive entertainment.", 59999, 54999, 6),
        ("Whirlpool Microwave 25L", "Whirlpool 25-liter convection microwave oven with 1000W grill, 900W microwave, auto cook menus, defrost function, child lock, and stainless steel interior for versatile cooking.", 19999, 18999, 10),
        ("Walton AC 1.5 Ton", "Walton 1.5 Ton inverter split air conditioner with energy-efficient compressor, copper condenser, turbo cooling, dehumidification, sleep mode, and anti-bacterial filter for cool comfort.", 64999, 59999, 5),
        ("GE Power Strip 6 Outlet", "GE 6-outlet surge protector power strip with 2400-joule protection, 2-foot cord, grounding indicator, slim design for tight spaces, and UL listed safety for home and office use.", 2499, 2299, 50),
        ("Prestige Cooker Set", "Prestige pressure cooker combo set with 3-liter and 5-liter capacity, aluminum body, multi-safety valve system, compatible with gas and induction cooktops for efficient cooking.", 8999, 8499, 15),
        ("Nestle Water Purifier", "Nestle Pure It water purifier with RO+UV+UF purification, 7-stage filtration, 12-liter storage tank, indicator for cartridge replacement, and wall-mountable design for safe drinking water.", 29999, 27999, 8),
        ("V-Guard Stabilizer", "V-Guard voltage stabilizer for 1.5 Ton AC with intelligent time delay system, wide working range of 150V-280V, LED display, surge protection, and thermal overload protection.", 5999, 5499, 20),
        ("Symphony Desert Cooler", "Symphony Diet 12T personal air cooler with i-Pure technology, honeycomb cooling pads, 12-liter water tank, low power consumption, and portable design for spot cooling in dry climates.", 14999, 13999, 12),
        ("Cello Thermos Flask", "Cello Opalware insulated stainless steel thermos flask with double-wall vacuum insulation, 12-hour hot/cold retention, leak-proof lid, and sleek design for home and office use.", 2999, 2799, 30),
    ],
    "Beauty & Health": [
        ("The Ordinary Niacinamide 10%", "The Ordinary Niacinamide 10% + Zinc 1% serum for pores and oil control. Lightweight water-based formula that reduces blemishes, regulates sebum production, and improves skin texture.", 2999, 2799, 40),
        ("CeraVe Moisturizing Cream", "CeraVe Moisturizing Cream with 3 essential ceramides, hyaluronic acid, and MVE technology for 24-hour hydration. Non-greasy, fragrance-free formula for face and body suitable for dry to very dry skin.", 3999, 3799, 35),
        ("La Roche-Posay Sunscreen SPF50", "La Roche-Posay Anthelios Ultra-Light Fluid SPF50+ with Cell-Ox Shield technology, ultra-resistant to water and sand, non-greasy invisible finish, suitable for sensitive skin.", 4999, 4799, 30),
        ("Maybelline Mascara", "Maybelline Lash Sensational Sky High Mascara with fiber-infused formula, flexible wand reaches every lash from root to tip, buildable volume and dramatic length without clumping.", 1999, 1799, 50),
        ("L'Oreal Shampoo Set", "L'Oreal Paris Anti-Hair Fall Shampoo and Conditioner set with Arginine and Aminexil, strengthens hair from root to tip, reduces hair fall by up to 80%, and nourishes scalp.", 2499, 2299, 45),
        ("Neutrogena Face Wash", "Neutrogena Oil-Free Acne Wash with Salicylic Acid 2%, micro-clear technology, glycerin-enriched formula that treats and prevents breakouts while gently cleansing without over-drying.", 2499, 2299, 40),
        ("Vitamin C Serum 30ml", "Premium Vitamin C 20% + Vitamin E + Hyaluronic Acid face serum for brightening, anti-aging, and dark spot correction. Lightweight fast-absorbing formula suitable for all skin types.", 3499, 3299, 25),
        ("Gillette Fusion ProGlide Razor", "Gillette Fusion ProGlide men's razor with 5 anti-friction blades, FlexBall technology, precision trimmer, Lubrastrip with Indicator, and ergonomic handle for the closest most comfortable shave.", 2999, 2799, 35),
        ("Mamaearth Onion Hair Oil", "Mamaearth Onion Hair Oil with plant keratin, onion seed oil, and coconut oil for hair fall control. Sulfate-free formula that strengthens roots, reduces hair thinning, and promotes growth.", 1499, 1299, 60),
        ("Wow Skin Science Aloe Gel", "Wow Skin Science 99% pure aloe vera multipurpose gel for face, hair, and body. Paraben-free, sulfate-free formula that soothes sunburn, moisturizes skin, and conditions hair.", 1299, 1199, 55),
        ("Bioderma Sensibio H2O", "Bioderma Sensibio H2O micellar water cleanser for sensitive skin, gentle enough for eye area, removes waterproof makeup, soothes and hydrates, hypoallergenic and dermatologist tested.", 3999, 3799, 28),
        ("Olay Regenerist Cream", "Olay Regenerist Micro-Sculpting Cream with amino-peptide complex and hyaluronic acid, anti-aging formula that hydrates to plump and firm skin, reduces fine lines in 2 weeks.", 5999, 5499, 15),
    ],
    "Sports & Fitness": [
        ("Decathlon Yoga Mat 6mm", "Decathlon 6mm thick non-slip yoga mat with alignment lines, lightweight and portable, made from TPE eco-friendly material, moisture-resistant surface, and carrying strap included.", 2999, 2799, 40),
        ("Nike Dri-FIT T-Shirt", "Nike Dri-FIT performance T-shirt with moisture-wicking technology, lightweight stretch fabric, flatlock seams to prevent chafing, and reflective elements for low-light visibility.", 4999, 4499, 30),
        ("Adjustable Dumbbell Set 20kg", "Adjustable dumbbell set pair (2x10kg) with spin-lock collars, solid iron plates, chrome-plated steel handles with knurled grip, and compact design for home gym workouts.", 14999, 13999, 12),
        ("Resistance Bands Set", "Set of 5 resistance bands in different strengths (10-50 lbs) with color coding, natural latex material, metal carabiner clips, door anchor, ankle straps, and carrying bag.", 1999, 1799, 50),
        ("Protein Shaker Bottle", "BPA-free 700ml protein shaker bottle with leak-proof lid, mixing grid for lump-free shakes, measurement markings, food-grade material, and dishwasher-safe design.", 999, 899, 80),
        ("Skipping Rope Speed", "Adjustable speed jumping rope with ball-bearing swivel for smooth rotation, PVC-coated steel cable, foam comfort grips, and adjustable length for all heights.", 799, 699, 100),
        ("Running Belt Waist Bag", "Water-resistant running belt with reflective strip, expandable pocket fits phones up to 6.7 inches, adjustable elastic waistband, breathable mesh, and secure zippered compartment.", 1499, 1299, 35),
        ("Compression Socks 3 Pack", "Pack of 3 graduated compression running socks for men and women, 15-20mmHg compression, moisture-wicking fabric, arch support, and anti-blister design for athletic recovery.", 2499, 2299, 25),
        ("Table Tennis Racket Set", "Professional table tennis racket set with 2 paddles, 3-star balls, premium rubber surface, 7-ply wooden blade, ergonomic handle, and carry case for tournament-quality play.", 3999, 3799, 18),
        ("Cricket Bat SS", "SS Ton Reserve Edition English willow cricket bat with full cane handle, optimized sweet spot, suitable for leather ball, and protective cover included for junior and senior players.", 14999, 13999, 6),
        ("Football Size 5", "FIFA Quality Pro approved size 5 match football with thermal-bonded panels, textured surface for aerodynamic flight, butyl bladder for air retention, and all-weather construction.", 3999, 3799, 20),
        ("Badminton Racket Yonex", "Yonex Nanoray lightweight carbon graphite badminton racket with isometric head shape, built-in T-joint, aerodynamic frame, and G4 grip for powerful smashes and precise drops.", 5999, 5499, 15),
    ],
    "Kids & Baby": [
        ("LEGO Classic Bricks 500pc", "LEGO Classic 10696 Medium Creative Brick Box with 500 pieces in 35 colors, 12 mini wheels, 2 doors, 3 windows, 2 base plates, and building ideas booklet for creative play.", 14999, 13999, 20),
        ("Hot Wheels Track Set", "Hot Wheels id Track Builder Set with motorized booster, 2 track loops, crash zone, 5 die-cast cars, and app-compatible track pieces for racing and stunt challenges.", 5999, 5499, 25),
        ("Barbie Dreamhouse", "Barbie 3-story Dreamhouse playset with 10 rooms, working elevator, pool with slide, garage with car, furnished interiors, and 70+ accessories for imaginative play.", 24999, 22999, 8),
        ("Baby Diapers Pampers L 54pc", "Pampers Premium Protection diapers size L (9-14 kg) with 54 pieces per pack, wetness indicator, 360-degree stretchy fit, soft cotton-like material, and up to 12 hours of dryness.", 3499, 3299, 60),
        ("Baby Stroller Lightweight", "Lightweight foldable baby stroller weighing 5.5kg with one-hand fold, adjustable recline seat, UV50+ canopy, 5-point safety harness, storage basket, and travel bag included.", 14999, 13999, 10),
        ("Kids Educational Tablet", "Kids learning tablet for ages 3-8 with 7-inch touchscreen, parental controls, pre-loaded educational apps, kid-proof case, camera, and WiFi connectivity for safe learning.", 12999, 11999, 15),
        ("Nursing Pillow U-Shape", "U-shaped nursing and feeding pillow with adjustable waist strap, removable cotton cover, memory foam filling, and multi-position support for mother and baby during feeding.", 3999, 3799, 30),
        ("Baby Car Seat ISOFIX", "ISOFIX-compatible baby car seat with side impact protection, 5-point harness, adjustable headrest and recline, breathable padding, and installation indicator for children 0-12 years.", 19999, 18999, 7),
        ("Toy Kitchen Set", "Complete toy kitchen set with realistic features including stove, oven, sink, and cutting board. Made from durable ABS plastic, battery-operated sounds, and realistic cooking accessories.", 12999, 11999, 12),
        ("Children's Bicycle 16 inch", "16-inch children's bicycle with training wheels, full chain guard, front and rear hand brakes, adjustable seat height, quick-release wheels, and colorful frame design.", 14999, 13999, 10),
        ("Wooden Puzzle Set 4 Pack", "Set of 4 educational wooden jigsaw puzzles with 60+ pieces each, featuring animals, world map, alphabet, and numbers. Non-toxic paint, smooth edges, and chunky pieces for small hands.", 2999, 2799, 35),
        ("Baby Monitor Wireless", "Wireless video baby monitor with 5-inch HD LCD screen, 360-degree pan/tilt camera, night vision, two-way audio, lullabies, temperature sensor, and 1000ft range.", 12999, 11999, 8),
    ],
    "Books & Stationery": [
        ("Atomic Habits by James Clear", "Atomic Habits by James Clear - the #1 New York Times bestseller on building good habits and breaking bad ones. Practical strategies backed by science for making incremental 1% improvements.", 1299, 1199, 50),
        ("Rich Dad Poor Dad", "Rich Dad Poor Dad by Robert Kiyosaki - the financial literacy classic that teaches the difference between assets and liabilities, how the wealthy think, and building financial freedom.", 1499, 1399, 45),
        ("IELTS Preparation Guide", "Comprehensive IELTS preparation guide covering all four sections: Listening, Reading, Writing, and Speaking. Includes practice tests, model answers, vocabulary lists, and exam strategies.", 2499, 2299, 30),
        ("Sketching Pad A3 100 sheets", "Artist quality A3 sketching pad with 100 sheets of 150gsm acid-free paper, spiral bound, suitable for pencil, charcoal, pastel, and light washes. Ideal for sketching and drawing.", 1499, 1299, 40),
        ("Faber Castell Color Pencils 36", "Faber-Castell Classic Colour Pencils set of 36 vibrant colors, break-resistant leads, soft laydown, and hexagonal barrel for comfortable grip. Safe and non-toxic for all ages.", 2999, 2799, 35),
        ("Pilot G2 Pen Set (10)", "Pilot G2 premium gel ink pen set of 10 assorted colors, smooth writing 0.7mm fine point, refillable design, comfortable rubber grip, and latex-free for everyday writing.", 1999, 1799, 60),
        ("Oxford Dictionary", "Oxford Advanced Learner's Dictionary 10th edition with 160,000 words, phrases, and meanings, 800+ color illustrations, Oxford 3000 key vocabulary, and free online access.", 3499, 3299, 20),
        ("Moleskine Notebook Large", "Moleskine Classic Large hardcover notebook with 240 pages of acid-free ivory paper, rounded corners, elastic closure, expandable inner pocket, and ribbon bookmark.", 4999, 4799, 18),
        ("Scientific Calculator Casio", "Casio FX-991EX ClassWiz scientific calculator with high-resolution display, 552 functions, spreadsheet mode, QR code visualization, and solar plus battery power.", 3999, 3799, 25),
        ("Whiteboard 4x3 ft", "4x3 feet magnetic dry erase whiteboard with aluminum frame, smooth writing surface, wall mount hardware included, and compatible with standard whiteboard markers and erasers.", 5999, 5499, 10),
    ],
    "Office Supplies": [
        ("HP LaserJet Printer", "HP LaserJet Pro M404dn wireless mono laser printer with automatic duplex printing, 40 pages per minute, 250-sheet tray, Ethernet connectivity, and HP Wolf Security for offices.", 29999, 27999, 5),
        ("Standing Desk Adjustable", "Electric height-adjustable standing desk with dual motor, memory controller with 4 presets, anti-collision technology, steel frame, and wide 120x60cm desktop for home and office.", 49999, 47999, 3),
        ("Ergonomic Office Chair", "Ergonomic office chair with adjustable lumbar support, breathable mesh back, 3D adjustable armrests, tilt lock, seat depth adjustment, and Class-4 gas lift for all-day comfort.", 24999, 22999, 8),
        ("Paper Shredder 12 Sheet", "12-sheet cross-cut paper shredder with 5-gallon pull-out bin, jam-proof technology, quiet operation, credit card and staple shredding, and castors for easy mobility.", 14999, 13999, 10),
        ("Label Maker Brother", "Brother P-Touch D210 portable label maker with QWERTY keyboard, multiple font styles, 14 symbol categories, laminated labels for indoor/outdoor use, and carry case included.", 12999, 11999, 7),
        ("Monitor Stand Riser", "Adjustable aluminum monitor stand riser with USB 3.0 hub, ergonomic height, ventilated design for heat dissipation, cable management, and supports up to 15kg.", 4999, 4799, 25),
        ("Webcam Logitech C920", "Logitech C920s HD Pro 1080p webcam with privacy shutter, stereo dual microphones, automatic light correction, wide field of view, and universal clip for laptops and monitors.", 12999, 11999, 12),
        ("Wireless Keyboard Mouse Combo", "Logitech MK270 wireless keyboard and mouse combo with 2.4GHz connection, spill-resistant keyboard, contoured mouse, 24-month battery life, and plug-and-play simplicity.", 5999, 5499, 30),
    ],
    "Automotive": [
        ("Car Phone Mount", "Universal magnetic car phone mount with strong N52 neodymium magnets, 360-degree rotation, dashboard air vent clips, one-hand operation, and silicone padding to protect devices.", 1499, 1299, 50),
        ("Dash Cam 4K WiFi", "4K UHD dash camera with WiFi connectivity, front 4K + rear 1080P dual recording, 170-degree wide angle, night vision, G-sensor, loop recording, and 24-hour parking surveillance.", 19999, 18999, 8),
        ("Car Vacuum Cleaner", "12V portable car vacuum cleaner with 5000Pa suction power, HEPA filter, 16-foot power cord, wet and dry capability, crevice tool, and brush attachment for thorough interior cleaning.", 5999, 5499, 20),
        ("Tire Pressure Gauge Digital", "Digital tire pressure gauge with 0-150 PSI range, backlit LCD display, 4 pressure units, auto-off, 360-degree rotating valve connector, and emergency LED flashlight.", 2999, 2799, 30),
        ("Jump Starter Power Bank", "12V 20000mAh portable car jump starter with 2000A peak current, USB fast charging, emergency LED light, smart safety clamps, and compact design that fits in your glove box.", 14999, 13999, 10),
        ("Car Seat Cover Full Set", "Full set leather car seat covers (front + rear) with waterproof PU leather, memory foam padding, breathable perforated design, airbag compatible, and universal fit for sedans and SUVs.", 14999, 13999, 12),
        ("Car Air Freshener Set", "Natural bamboo charcoal car air freshener set of 4 pieces, absorbs odors and moisture, non-toxic and fragrance-free, reusable for 2 years, and convenient hanging design.", 1499, 1299, 60),
        ("OBD2 Scanner Bluetooth", "Bluetooth OBD2 car diagnostic scanner compatible with Android and iOS, reads engine fault codes, real-time data streaming, freeze frame data, and I/M readiness for DIY car maintenance.", 5999, 5499, 15),
    ],
    "Pet Supplies": [
        ("Dry Cat Food 5kg", "Premium dry cat food 5kg bag with real chicken as first ingredient, omega fatty acids for healthy coat, taurine for heart and eye health, no artificial colors or preservatives.", 4999, 4799, 25),
        ("Dog Leash Retractable", "Retractable dog leash with 16-foot tape cord, one-button brake and lock, anti-slip soft grip handle, suitable for dogs up to 25kg, and tangle-free mechanism.", 2999, 2799, 30),
        ("Pet Bed Orthopedic", "Orthopedic memory foam pet bed with gel-infused cooling layer, waterproof liner, removable machine-washable cover, non-skid bottom, and bolster edges for head support.", 12999, 11999, 10),
        ("Cat Litter Box Self-Cleaning", "Automatic self-cleaning cat litter box with infrared sensor, rake cleaning system, anti-stuck design, 5L waste capacity, low noise motor, and carbon filter for odor control.", 24999, 22999, 5),
        ("Dog Shampoo Oatmeal", "Oatmeal and aloe vera dog shampoo with pH-balanced formula for sensitive skin, soap-free and tear-free, deodorizing formula, and suitable for puppies and adult dogs of all breeds.", 1999, 1799, 40),
        ("Bird Cage Large", "Large multi-level bird cage with slide-out tray, multiple perches, feeding cups, swing, ladder, wide front door, and powder-coated wrought iron construction for parrots and parakeets.", 14999, 13999, 8),
        ("Fish Tank Filter 200L", "External canister filter for aquariums up to 200L with 800L/h flow rate, 3-stage biological/mechanical/chemical filtration, quiet motor, and multiple media baskets.", 9999, 9499, 12),
        ("Pet Carrier Airline Approved", "Airline-approved soft-sided pet carrier for cats and small dogs up to 8kg, ventilation mesh windows, seatbelt loop, removable fleece pad, and fits under airplane seat.", 12999, 11999, 10),
    ],
    "Garden & Outdoor": [
        ("Garden Hose 30m", "30-meter expandable garden hose with 10-function spray nozzle, brass fittings, triple-layer latex core, flexible and lightweight design, and kink-resistant construction.", 4999, 4799, 20),
        ("Solar Garden Lights (10)", "Pack of 10 solar-powered LED garden path lights with warm white glow, stainless steel construction, auto on/off sensor, IP44 waterproof, and 6-8 hours of illumination.", 5999, 5499, 18),
        ("Lawn Mower Electric", "Cordless rechargeable lawn mower with 36V lithium battery, 33cm cutting width, 5 cutting heights, 30L grass collection bag, and compact foldable design for small to medium lawns.", 24999, 22999, 6),
        ("Plant Pots Set (5)", "Set of 5 ceramic plant pots in assorted sizes (10-18cm diameter) with drainage holes and saucers, matte glaze finish, and minimalist design for indoor and outdoor gardening.", 5999, 5499, 15),
        ("Pruning Shears Professional", "Professional bypass pruning shears with SK5 high-carbon steel blade, ergonomic non-slip handles, sap groove design, safety lock, and adjustable blade tension for clean cuts.", 2999, 2799, 30),
        ("Compost Bin 30L", "30-liter outdoor composting tumbler with dual-chamber design for continuous composting, UV-resistant material, tumbling mechanism, and aeration vents for fast decomposition.", 9999, 9499, 10),
        ("Sprinkler System Auto", "Programmable automatic garden sprinkler system with 12-zone controller, adjustable spray pattern, rain delay function, drip irrigation compatible, and battery backup.", 7999, 7499, 12),
        ("Outdoor Furniture Set", "4-seater patio furniture set with powder-coated steel frame, all-weather PE rattan weave, tempered glass top table, thick cushions with removable covers, and umbrellas hole.", 49999, 47999, 3),
    ],
    "Kitchen": [
        ("Air Fryer Oven Large", "17L large digital air fryer oven with 12 cooking presets, 1800W power, 360-degree hot air circulation, rotisserie function, dehydrator mode, and dishwasher-safe accessories.", 24999, 22999, 8),
        ("Blender Mixer Grinder", "750W 3-in-1 kitchen blender mixer grinder with 3 stainless steel jars, multi-speed control with pulse function, blade locking system, anti-skid feet, and overload protection.", 8999, 8499, 20),
        ("Non-Stick Cookware Set", "10-piece PFOA-free non-stick cookware set with forged aluminum body, tempered glass lids, cool-touch silicone handles, induction compatible base, and oven-safe to 180°C.", 12999, 11999, 12),
        ("Electric Kettle 2L", "2-liter double-wall insulated electric kettle with 1500W rapid boil, stainless steel interior, 360-degree base, auto shut-off, boil-dry protection, and cool-touch exterior.", 4999, 4799, 25),
        ("Rice Cooker 5 Cup", "5-cup fuzzy logic rice cooker with 8 cooking functions, non-stick inner pot, keep warm function, LED display, delay timer, and measuring cup and serving spatula included.", 7999, 7499, 15),
        ("Food Processor 1000W", "1000W multi-function food processor with 2.5L bowl, 8 stainless steel blades, 2-speed plus pulse, safety interlock, and accessories for chopping, blending, slicing, and kneading.", 14999, 13999, 10),
        ("Knife Set 8 Piece", "8-piece German steel knife block set with chef's knife, bread knife, utility knife, paring knife, kitchen shears, sharpening steel, and magnetic acacia wood knife block.", 14999, 13999, 8),
        ("Toaster 4 Slice", "4-slice brushed stainless steel toaster with wide slots, 7 shade settings, defrost/reheat/cancel functions, removable crumb tray, and high-lift lever for small items.", 8999, 8499, 15),
        ("Espresso Machine", "Semi-automatic espresso machine with 15-bar Italian pump, 1450W thermoblock, stainless steel portafilter, milk frothing wand, 1.7L water tank, and cup warming tray.", 49999, 47999, 4),
        ("Blender Portable USB", "Portable personal travel blender with USB-C charging, 380ml BPA-free bottle, 6-blade stainless steel cutter, one-touch operation, and 2000mAh battery for 15+ blends on the go.", 2999, 2799, 40),
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

# ── Category-to-color mapping for placehold.co ───────────────────────────────
CATEGORY_COLORS = {
    "Electronics": ("1e40af", "ffffff"),
    "Fashion": ("be185d", "ffffff"),
    "Home & Living": ("065f46", "ffffff"),
    "Kitchen": ("9a3412", "ffffff"),
    "Beauty & Health": ("7e22ce", "ffffff"),
    "Sports & Fitness": ("15803d", "ffffff"),
    "Kids & Baby": ("d97706", "ffffff"),
    "Books & Stationery": ("1d4ed8", "ffffff"),
    "Office Supplies": ("374151", "ffffff"),
    "Automotive": ("b91c1c", "ffffff"),
    "Pet Supplies": ("0e7490", "ffffff"),
    "Garden & Outdoor": ("166534", "ffffff"),
    "Health & Wellness": ("7e22ce", "ffffff"),
}


def get_product_image(product_name: str, category: str, idx: int) -> str:
    """Generate a reliable placeholder image URL using placehold.co.

    placehold.co is a reliable CDN-backed service that generates placeholder
    images. Unlike picsum.photos, it is accessible globally and never fails.
    Each product gets a unique image with its name displayed.
    """
    bg_color, text_color = CATEGORY_COLORS.get(category, ("374151", "ffffff"))
    # Truncate product name for display
    display_name = product_name[:30]
    # URL-encode the product name for the placeholder
    encoded_name = quote(display_name)
    # Different index = slightly different shade for variety
    shades = [bg_color, "0f172a", "1e293b", "334155"]
    color = shades[idx % len(shades)]
    return f"https://placehold.co/800x800/{color}/{text_color}?text={encoded_name}"


async def seed_marketplace(force: bool = False):
    async with AsyncSessionLocal() as db:
        # Check existing sellers
        result = await db.execute(select(func.count(Seller.id)))
        existing_sellers = result.scalar() or 0
        if existing_sellers > 10 and not force:
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
        updated_count = 0
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

                    # Check if product already exists
                    existing_result = await db.execute(
                        select(Product).where(Product.seller_id == seller_id, Product.name == name)
                    )
                    existing_product = existing_result.scalar_one_or_none()

                    if existing_product:
                        if force:
                            # Fix existing product: update description and images if missing/broken
                            needs_update = False
                            if not existing_product.description or existing_product.description.strip() == "":
                                existing_product.description = description
                                needs_update = True
                            if not existing_product.image_url or "picsum.photos" in (existing_product.image_url or ""):
                                existing_product.image_url = get_product_image(name, category, 0)
                                needs_update = True
                            # Fix image_urls JSON array
                            current_urls = existing_product.get_image_urls() or []
                            has_broken = any("picsum.photos" in (u or "") for u in current_urls)
                            if not current_urls or has_broken:
                                existing_product.set_image_urls(
                                    [get_product_image(name, category, i) for i in range(3)]
                                )
                                needs_update = True
                            if needs_update:
                                updated_count += 1
                        continue

                    # Convert BDT to USD (approximate: 1 USD ≈ 110 BDT)
                    price_usd = round(price / 110, 2)
                    discount_usd = round(discount_price / 110, 2)

                    # Create product with reliable image URLs
                    image_url = get_product_image(name, category, 0)
                    image_urls = json.dumps([get_product_image(name, category, i) for i in range(3)])

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

        if force and updated_count > 0:
            print(f"\n✅ Fixed {updated_count} existing products with missing/broken data")

        print(f"✅ Seeded {product_count} new products across {len(seller_map)} stores")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed marketplace demo data")
    parser.add_argument("--force", action="store_true", help="Fix existing products with NULL descriptions or broken images")
    args = parser.parse_args()
    asyncio.run(seed_marketplace(force=args.force))
