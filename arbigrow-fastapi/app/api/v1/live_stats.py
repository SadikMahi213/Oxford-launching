import time

from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/live-stats", tags=["Live Stats"])

# ─────────────────────────────────────────────────────────────────────────────
# Shared, server-authoritative presentation layer for Global Live Activity and
# OFA Cryptocurrency live stats.
#
# IMPORTANT: This is display-only data. Nothing here is written to the
# database and no real financial records are created. Every value is a pure
# function of the server clock, so all users, devices and (stateless) workers
# observe the IDENTICAL global stream — eliminating per-browser random
# divergence. The event sequence is anchored to `seq = floor(now / 1000)`,
# therefore it is independent of who is logged in, page refreshes, or which
# browser opened the page.
#
# The three OFA Cryptocurrency metrics are fully INDEPENDENT of each other.
# Each one ticks on its own cadence (Live Online every 3s, Tasks every 5s,
# Earnings every 10s) and is computed as a pure function of the server clock, so
# they drift apart naturally instead of moving together on a shared poll. The
# Earnings/Tasks counters run on their own persistent 24h windows anchored to
# UTC midnight (now_s % 86400) — they start at $0.00 / 0 at the boundary and
# never reset on refresh, logout or login.
#
# Approved ranges (identical for every user, always, by construction):
#   Live Online .......... ~190,000 (always 180,000+), ±400–500 per 3s tick,
#                          hard ceiling 600,000, mean-reverting random walk
#   Tasks Completed Today. 0 – ~200,000 across the 24h UTC window, every 5s
#   Platform Earnings ..... $0 – $40,000–$50,000 (per-day ceiling chosen
#                          dynamically) across the 24h UTC window, every 10s
# ─────────────────────────────────────────────────────────────────────────────

EVENT_INTERVAL_MS = 1000
WINDOW = 8  # number of recent events returned per request
DAY_SECONDS = 86400  # 24h UTC window shared by the daily OFA counters

# Weighted activity types — terminology/i18n keys match the frontend exactly.
ACTIVITY_TYPES = [
    ("withdraw", "💸", "liveActivityFeed.types.withdraw", 10),
    ("deposit", "🏦", "liveActivityFeed.types.deposit", 10),
    ("captcha", "🔐", "liveActivityFeed.types.captcha", 20),
    ("ads", "📺", "liveActivityFeed.types.ads", 20),
    ("ecommerce", "🛒", "liveActivityFeed.types.ecommerce", 15),
    ("mining", "⛏️", "liveActivityFeed.types.mining", 10),
    ("task", "💻", "liveActivityFeed.types.task", 10),
    ("signup", "🎉", "liveActivityFeed.types.signup", 5),
]

TASK_KEYS = [
    "liveActivityFeed.tasks.dataEntry",
    "liveActivityFeed.tasks.graphics",
    "liveActivityFeed.tasks.videoEditing",
    "liveActivityFeed.tasks.digitalMarketing",
]

# Curated country list (code, display name, weight). Philippines is weighted
# higher to reflect the existing presentation bias.
COUNTRIES = [
    ("US", "United States", 3), ("GB", "United Kingdom", 3), ("IN", "India", 4),
    ("PH", "Philippines", 8), ("BD", "Bangladesh", 5), ("PK", "Pakistan", 4),
    ("MY", "Malaysia", 3), ("NG", "Nigeria", 4), ("ID", "Indonesia", 4),
    ("BR", "Brazil", 3), ("EG", "Egypt", 3), ("KE", "Kenya", 3),
    ("VN", "Vietnam", 3), ("MX", "Mexico", 3), ("TR", "Turkey", 3),
    ("RU", "Russia", 2), ("JP", "Japan", 2), ("DE", "Germany", 2),
    ("FR", "France", 2), ("CA", "Canada", 2), ("AU", "Australia", 2),
    ("AE", "United Arab Emirates", 2), ("ZA", "South Africa", 2),
    ("LK", "Sri Lanka", 3), ("NP", "Nepal", 3),
]

# Centralized country → culturally/natively appropriate name pools. Keyed by
# the same ISO country codes used everywhere in the live stream, so the name
# shown for a notification always matches the country attached to that event.
# Every country in COUNTRIES has a dedicated pool; anything else falls back to
# a safe generic international pool. These mirror the presentation bias of the
# existing app and never expose real user PII.
COUNTRY_NAME_POOLS = {
    "US": {
        "first": ["James","John","Robert","Michael","David","William","Richard","Joseph","Thomas","Christopher","Matthew","Daniel","Andrew","Joshua","Anthony","Kevin","Laura","Jennifer","Jessica","Sarah","Amanda","Ashley","Stephanie","Nicole","Elizabeth","Megan"],
        "last": ["Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez","Anderson","Taylor","Thomas","Moore","Jackson","Martin","Lee","Thompson","White","Harris","Clark","Lewis","Robinson","Walker","Hall","Young"],
    },
    "GB": {
        "first": ["Oliver","George","Harry","Jack","Charlie","Thomas","Oscar","William","James","Henry","Alfie","Archie","Ethan","Isaac","Freddie","Emily","Olivia","Isla","Ava","Mia","Isabella","Sophia","Grace","Lily","Freya","Evie"],
        "last": ["Smith","Jones","Williams","Brown","Taylor","Davies","Wilson","Evans","Thomas","Roberts","Johnson","Walker","Wright","Robinson","Thompson","Green","Hall","Mitchell","Martin","Cooper","Hill","Morris","Ward","Turner","Scott"],
    },
    "DE": {
        "first": ["Lukas","Leon","Finn","Noah","Elias","Paul","Ben","Felix","Max","Louis","Hannah","Emma","Mia","Sofia","Lina","Lea","Anna","Marie","Charlotte","Amelie","Clara","Lena","Sophie","Ida","Laura"],
        "last": ["Mueller","Schmidt","Schneider","Fischer","Weber","Meyer","Wagner","Becker","Schulz","Hoffmann","Koch","Richter","Klein","Wolf","Schröder","Neumann","Schwarz","Zimmermann","Braun","Hartmann","Lange","Krause","Lehmann","Koehler","Herrmann"],
    },
    "FR": {
        "first": ["Gabriel","Louis","Raphael","Hugo","Arthur","Jules","Nathan","Gabin","Louise","Jade","Camille","Emma","Chloé","Inès","Léa","Manon","Alice","Rose","Léon","Émile","Noé","Adam","Mael","Maxime","Hélène"],
        "last": ["Martin","Bernard","Dubois","Thomas","Robert","Richard","Petit","Durand","Leroy","Moreau","Simon","Laurent","Lefebvre","Michel","Garcia","David","Bertrand","Roux","Vincent","Fournier","Morel","Girard","André","Lefevre","Mercier"],
    },
    "JP": {
        "first": ["Haruto","Ren","Yuto","Sota","Hinata","Kaito","Riku","Sora","Takumi","Yamato","Aoi","Yui","Sakura","Rin","Hana","Mio","Mei","Koharu","Ichika","Momoka","Koki","Haruki","Soshi","Rui","Naoki"],
        "last": ["Sato","Suzuki","Takahashi","Tanaka","Watanabe","Ito","Yamamoto","Nakamura","Kobayashi","Kato","Yoshida","Yamada","Sasaki","Yamaguchi","Matsumoto","Inoue","Kimura","Hayashi","Shimizu","Ogawa","Ishii","Saito","Fujita","Okada","Sasaki"],
    },
    "IN": {
        "first": ["Aarav","Vivaan","Aditya","Arjun","Vihaan","Sai","Reyansh","Krishna","Ishaan","Shaurya","Diya","Ananya","Priya","Neha","Aisha","Sneha","Kavya","Pari","Aditi","Riya","Rohan","Ved","Kabir","Arnav","Viresh"],
        "last": ["Sharma","Verma","Gupta","Singh","Kumar","Das","Reddy","Nair","Patel","Joshi","Iyer","Mishra","Pandey","Thakur","Rao","Choudhary","Mehta","Chauhan","Malhotra","Bhat","Pillai","Kapoor","Sinha","Bose","Dutta"],
    },
    "BR": {
        "first": ["Miguel","Arthur","Bernardo","Heitor","Davi","Lorenzo","Gabriel","Lucas","Matheus","Rafael","Valentina","Helena","Laura","Sophia","Manuela","Giovanna","Alice","Maria","Isabela","Cecilia","Enzo","Pedro","Felipe","Samuel","Gustavo"],
        "last": ["Silva","Santos","Oliveira","Souza","Rodrigues","Ferreira","Almeida","Pereira","Lima","Gomes","Costa","Ribeiro","Martins","Carvalho","Alves","Lopes","Soares","Fernandes","Vieira","Barbosa","Rocha","Dias","Nascimento","Andrade","Moreira"],
    },
    "MX": {
        "first": ["Santiago","Mateo","Sebastián","Leonardo","Daniel","Diego","Andrés","Emiliano","Joaquín","Miguel","Sofía","Valentina","Camila","Ximena","Maria","Lucía","Victoria","Fernanda","Regina","Mariana","Alejandro","Carlos","José","Luis","Marco"],
        "last": ["Hernández","García","Martínez","López","González","Rodríguez","Pérez","Sánchez","Ramírez","Torres","Flores","Rivera","Gómez","Díaz","Cruz","Morales","Reyes","Gutiérrez","Ortiz","Ruiz","Vargas","Castillo","Jiménez","Moreno","Herrera"],
    },
    "NG": {
        "first": ["Chinedu","Emeka","Obinna","Chukwuemeka","Ikenna","Chidi","Tunde","Adebayo","Olumide","Ngozi","Adaeze","Chiamaka","Nneka","Amara","Ifeoma","Chioma","Folake","Funke","Aisha","Kelechi","Obiora","Uche","Chinedu","Ifeanyi","Ibrahim"],
        "last": ["Abubakar","Mohammed","Ogundimu","Okafor","Adeyemi","Olawale","Ibrahim","Usman","Bello","Yusuf","Olawale","Adewale","Okonkwo","Nnamdi","Obi","Eze","Olu","Bakare","Onwueme","Chukwu","Ogundipe","Akinwale","Adeleke","Oyewole","Fashola"],
    },
    "ZA": {
        "first": ["Sipho","Thabo","Lungile","Nomsa","Bongani","Thandeka","Sizwe","Ayanda","Nkululeko","Mandla","Zanele","Lerato","Thandi","Precious","Nomvula","Nompumelelo","Khulekani","Sandile","Muzi","Sibusiso","Lindiwe","Busisiwe","Zandile","Ayanda","Hlengiwe"],
        "last": ["Ndlovu","Nkosi","Dlamini","Van Wyk","Van Der Merwe","Muller","Botha","Du Plessis","Steyn","Potgieter","Le Roux","Smit","Joubert","Swart","Fourie","Venter","Pretorius","Wessels","Barnard","Visser","Kruger","Boshoff","Du Toit","Van Zyl","Marais"],
    },
    "PH": {
        "first": ["Jose","Juan","Pedro","Miguel","Antonio","Ramon","Angel","Carlos","Rafael","Fernando","Maria","Ana","Rosa","Lorna","Corazon","Virginia","Teresa","Elena","Grace","Carmen","Mark","John","David","Michael","Christian"],
        "last": ["Santos","Reyes","Cruz","Bautista","Ocampo","Garcia","Mendoza","Torres","Ramos","Rivera","Gonzales","Delgado","Pascual","Villanueva","Aquino","Lopez","Santiago","Mercado","Padilla","Roxas","Castro","Fernandez","Morales","Gomez","Hernandez"],
    },
    "EG": {
        "first": ["Mohamed","Ahmed","Mahmoud","Omar","Hassan","Ali","Mustafa","Youssef","Karim","Amr","Fatma","Nour","Salma","Hana","Mona","Yasmin","Aya","Nada","Layla","Menna","Khaled","Ibrahim","Tarek","Hisham","Mostafa"],
        "last": ["Mohamed","Ali","Hassan","Ibrahim","Ahmed","Mahmoud","Mostafa","Khalil","Samir","Farouk","Nour","Hamed","Galal","Salem","Reda","Sayed","Metwally","Abbas","Hamdy","Mansour","Youssef","Zaki","Adel","Sami","Osman"],
    },
    "KE": {
        "first": ["Brian","Kevin","Dennis","Victor","Martin","Joseph","Daniel","Samuel","Patrick","Stephen","Faith","Grace","Joy","Rose","Janet","Mary","Agnes","Jane","Esther","Alice","Wesley","Allan","Collins","Ian","Kevin"],
        "last": ["Mwangi","Kamau","Odhiambo","Omondi","Wanjiku","Njoroge","Kiptoo","Wafula","Otieno","Muthoni","Kimani","Maina","Ngugi","Wairimu","Njeri","Karanja","Gichuru","Kariuki","Mutua","Kioko","Ndungu","Macharia","Njenga","Kipchoge","Sang"],
    },
    "VN": {
        "first": ["Minh","Hùng","Đức","Tài","Dũng","Tuấn","Khoa","Đạt","Phúc","Thắng","Linh","Chi","Hương","Mai","Phượng","Nga","Lan","Hà","Trang","Thảo","Quốc","Ngọc","Việt","Nam","Bình"],
        "last": ["Nguyễn","Trần","Lê","Phạm","Hoàng","Huỳnh","Phan","Vũ","Võ","Đặng","Bùi","Đỗ","Hồ","Ngô","Dương","Lý","Mai","Tô","Trương","Cao","Bạch","Tạ","Đào","Thạch","Tăng"],
    },
    "ID": {
        "first": ["Muhammad","Aditya","Bagas","Dimas","Fajar","Rizky","Yoga","Arya","Ilham","Putri","Siti","Ratna","Dewi","Wulan","Anisa","Rika","Lestari","Sari","Budi","Santoso","Hendra","Wibowo","Pratama","Ayu","Nadia"],
        "last": ["Setiawan","Pratama","Wijaya","Saputra","Putra","Hidayat","Ramadhani","Gunawan","Santoso","Purnama","Lestari","Anggraini","Kusuma","Aditya","Nugroho","Susanto","Hermawan","Suryana","Budiman","Sugiyarto","Wibowo","Hakim","Pamungkas","Sutanto","Utomo"],
    },
    "MY": {
        "first": ["Muhammad","Amir","Aiman","Danial","Fahmi","Irfan","Haziq","Aqil","Rizal","Afif","Nur","Siti","Nurul","Aisyah","Aisha","Fatimah","Nabilah","Husna","Syafiqah","Amira","Izzat","Hakim","Farhan","Arif","Zakwan"],
        "last": ["Mohammed","Ahmad","Abdullah","Ali","Ibrahim","Hassan","Hussein","Khalid","Omar","Ismail","Sulaiman","Yusof","Rahman","Razak","Hamid","Baharuddin","Hashim","Kadir","Salleh","Taha","Yakub","Yaakob","Nordin","Osman","Ramli"],
    },
    "PK": {
        "first": ["Muhammad","Ahmed","Ali","Hassan","Husain","Usman","Omar","Bilal","Hamza","Daniyal","Ayesha","Fatima","Zara","Sana","Hira","Noor","Amina","Maham","Iqra","Safiya","Farhan","Danish","Faisal","Imran","Kamran"],
        "last": ["Khan","Malik","Ahmad","Hussain","Iqbal","Butt","Chaudhry","Sheikh","Qureshi","Siddiqui","Nawaz","Shah","Raja","Javed","Akhtar","Raza","Bashir","Hashmi","Awan","Yousaf","Khawaja","Mirza","Alvi","Durrani","Gill"],
    },
    "BD": {
        "first": ["Tanvir","Sakib","Rafiq","Momin","Jahid","Nayeem","Shakil","Rony","Tushar","Tasnim","Nusrat","Maliha","Jannat","Mim","Nafisa","Taniya","Sumaiya","Joya","Ruma","Rahim","Karim","Hasan","Hossain","Faruk","Sabbir"],
        "last": ["Rahman","Hossain","Khan","Islam","Ahmed","Ali","Uddin","Miah","Chowdhury","Das","Begum","Akter","Sultana","Khatun","Parveen","Sheikh","Mollah","Sarkar","Talukder","Banu","Haque","Mondal","Ferdous","Rana","Howlader"],
    },
    "TR": {
        "first": ["Yusuf","Mustafa","Ahmet","Mehmet","Hasan","Ali","Huseyin","Ibrahim","Emir","Arda","Elif","Zeynep","Yasmin","Sena","Azra","Ebrar","Hilal","Nisa","Beren","Defne","Mert","Can","Emre","Burak","Kerem"],
        "last": ["Yilmaz","Kaya","Demir","Celik","Sahin","Yildiz","Yalcin","Ozturk","Aydin","Ozdemir","Arslan","Dogan","Kilic","Aslan","Cetin","Karaca","Ozer","Gunes","Bozkurt","Senturk","Aksoy","Erdogan","Korkmaz","Tuncer","Akar"],
    },
    "RU": {
        "first": ["Alexander","Nikita","Mikhail","Daniil","Artyom","Ilya","Maxim","Kirill","Egor","Roman","Anastasia","Maria","Anna","Daria","Elena","Polina","Victoria","Ksenia","Natalia","Tatiana","Sergei","Andrei","Dmitri","Alexei","Pavel"],
        "last": ["Ivanov","Petrov","Sidorov","Kuznetsov","Popov","Volkov","Novikov","Morozov","Sokolov","Lebedev","Kozlov","Orlov","Fedorov","Zaitsev","Soloviev","Vasiliev","Mikhailov","Pavlov","Semenov","Golubev","Bogdanov","Vorobiev","Sergeev","Romanov"],
    },
    "CA": {
        "first": ["Liam","Noah","Oliver","Ethan","Lucas","Aiden","Mason","Logan","Jacob","William","Olivia","Emma","Charlotte","Amelia","Mia","Harper","Evelyn","Abigail","Emily","Ella","Leo","James","Benjamin","Alexander","Sebastian"],
        "last": ["Smith","Brown","Tremblay","Roy","Gagnon","Lee","Martin","Campbell","Stewart","Johnston","Thompson","Wilson","Kelly","Murray","Davis","MacDonald","Bouchard","Belanger","Gauthier","Cote","Ross","Reid","Pelletier","Fournier","Lavoie"],
    },
    "AU": {
        "first": ["Oliver","Noah","Liam","William","Jack","Lucas","Henry","Alexander","Ethan","James","Charlotte","Olivia","Amelia","Mia","Isla","Sophia","Aisha","Grace","Chloe","Lily","Elijah","Thomas","Sebastian","Benjamin","Daniel"],
        "last": ["Smith","Jones","Williams","Brown","Wilson","Taylor","Johnson","White","Martin","Anderson","Thompson","Garcia","Martinez","Robinson","Clark","Rodriguez","Lewis","Lee","Walker","Hall","Allen","Young","King","Wright","Scott"],
    },
    "AE": {
        "first": ["Mohamed","Ahmed","Ali","Hassan","Khalid","Omar","Sultan","Fahad","Saif","Hamad","Mariam","Fatima","Latifa","Shaikha","Sara","Noura","Reem","Aisha","Maryam","Rashid","Saeed","Humaid","Youssef","Salem","Hamdan"],
        "last": ["Al Maktoum","Al Nahyan","Al Rashid","Al Mulla","Al Dhaheri","Al Shamsi","Al Ketbi","Al Suwaidi","Al Blooshi","Al Zaabi","Al Nuaimi","Al Falasi","Al Hashemi","Al Otaiba","Al Mansoori","Al Kaabi","Al Dhanhani","Al Rumaithi","Al Neyadi","Al Belushi","Al Maamari","Al Tunaiji","Al Hebsi","Al Astad","Al Marri"],
    },
    "LK": {
        "first": ["Kamal","Ruwan","Nimal","Anura","Chaminda","Dinesh","Kasun","Lahiru","Sandun","Tharindu","Nadeesha","Shamali","Kumari","Udari","Ishara","Dilini","Sanduni","Thilini","Nayana","Shanthi","Aruna","Sunil","Prasanna","Nuwan","Harsha"],
        "last": ["Perera","Fernando","Silva","Dias","Wijesinghe","Gunawardena","Jayawardena","Rathnayake","Weerasinghe","Bandara","Herath","Liyanage","Senanayake","Wickramasinghe","Karunaratne","Ekanayake","Samaraweera","Amarasinghe","Peiris","Abeysinghe","Dissanayake","Mendis","Seneviratne","Ranasinghe","De Alwis"],
    },
    "NP": {
        "first": ["Rajesh","Suman","Bikash","Prakash","Sagar","Ramesh","Santosh","Dipesh","Nirajan","Binod","Sunita","Sita","Rita","Anita","Sabina","Srijana","Pooja","Kavita","Anjana","Mamata","Krishna","Gopal","Hari","Ram","Shyam"],
        "last": ["Shrestha","Tamang","Gurung","Rai","Magar","Thapa","Karki","Poudel","Adhikari","Bhattarai","Khadka","Basnet","Koirala","Maharjan","Acharya","Bhandari","Pandey","Dahal","Neupane","Ghimire","Budhathoki","Dhami","Rimal","Gautam","Lama"],
    },
}

# Safe generic international fallback for any country code without a dedicated
# pool. Never undefined/null/Unknown — always a plausible full name.
FALLBACK_NAME_POOL = {
    "first": ["James","Maria","Mohammed","Aisha","Liam","Sofia","Noah","Emma","Arjun","Lucas","Olivia","Daniel","Grace","Carlos","Amara","Yusuf","Layla","Ethan","Chloe","Ravi","Mateo","Zara","Nadia","Omar","Elena","Sara","Diego","Hassan","Maya","Sami"],
    "last": ["Smith","Garcia","Khan","Rahman","Johnson","Patel","Silva","Hassan","Brown","Lopez","Singh","Ahmed","Nguyen","Walker","Diaz","Sharma","Costa","Ali","Reyes","Okafor","Fernandez","Ibrahim","Santos","Cohen","Mensah","Novak","Haddad","Schmidt","Rossi","Kim"],
}


def _weighted_index(rng, weights):
    total = sum(weights)
    r = rng.random() * total
    for i, w in enumerate(weights):
        r -= w
        if r <= 0:
            return i
    return len(weights) - 1


def _amount(rng, atype, task_key):
    if atype == "withdraw":
        r = rng.random()
        if r < 0.5:
            raw = 10 + rng.random() * 80
        elif r < 0.8:
            raw = 90 + rng.random() * 160
        elif r < 0.95:
            raw = 250 + rng.random() * 250
        else:
            raw = 500 + rng.random() * 200
        raw = min(700, max(10, raw))
        return f"${raw:.2f}"
    if atype == "deposit":
        r = rng.random()
        if r < 0.45:
            raw = 10 + rng.random() * 90
        elif r < 0.75:
            raw = 100 + rng.random() * 200
        elif r < 0.93:
            raw = 300 + rng.random() * 400
        else:
            raw = 700 + rng.random() * 300
        return f"${round(raw)}"
    if atype == "captcha":
        return f"${(0.01 + rng.random() * 2):.2f}"
    if atype == "ads":
        return f"${(0.02 + rng.random() * 1.5):.2f}"
    if atype == "ecommerce":
        return f"${(5 + rng.random() * 195):.2f}"
    if atype == "mining":
        return f"{(0.5 + rng.random() * 19.5):.2f} OFA"
    if atype == "task":
        idx = TASK_KEYS.index(task_key) if task_key in TASK_KEYS else 3
        spans = [(2, 30), (8, 120), (10, 190), (5, 145)]
        lo, span = spans[idx]
        return f"${(lo + rng.random() * span):.2f}"
    return None


def _event_for_index(n):
    # Deterministic event for global sequence index `n`. Identical for every
    # request because the RNG is seeded by `n`.
    rng = __import__("random").Random(n)
    ti = _weighted_index(rng, [w for *_, w in ACTIVITY_TYPES])
    atype, icon, action_key, _ = ACTIVITY_TYPES[ti]
    task_key = TASK_KEYS[_weighted_index(rng, [25, 25, 25, 25])] if atype == "task" else None
    ci = _weighted_index(rng, [w for _, _, w in COUNTRIES])
    code, cname, _ = COUNTRIES[ci]
    pool = COUNTRY_NAME_POOLS.get(code, FALLBACK_NAME_POOL)
    name = f"{rng.choice(pool['first'])} {rng.choice(pool['last'])}"
    amount = _amount(rng, atype, task_key)
    return {
        "id": n,
        "name": name,
        "country": {"code": code, "name": cname},
        "activity": {
            "type": atype,
            "icon": icon,
            "actionKey": action_key,
            "taskKey": task_key,
        },
        "amount": amount,
        "timestamp": n * 1000,
    }


LIVE_ONLINE_BASE = 190000       # startup/normal floor (always displayed 180,000+)
LIVE_ONLINE_MIN = 150000        # absolute lower bound — never below reality
LIVE_ONLINE_MAX = 600000        # approved hard ceiling
LIVE_ONLINE_BAND = 10000        # mean reversion: pull back inside ±band of base
_WALK_PULL_MIN = 400            # per-tick delta magnitude ±400–500
_WALK_PULL_MAX = 500

# Precomputed once per UTC day so each request is O(1) instead of replaying a
# 28,800-step walk. Deterministic (values are pure functions of `day`), so
# every worker/user observes the identical global stream; only kept for the
# just-completed and current day to bound memory.
_live_walk_cache = {}


def _live_walk(day):
    cached = _live_walk_cache.get(day)
    if cached is not None:
        return cached
    if len(_live_walk_cache) >= 2:
        _live_walk_cache.clear()
    rng = __import__("random").Random(day)
    base = LIVE_ONLINE_BASE + rng.randrange(5001)  # 190,000–195,000 per day
    vals = [base]
    val = base
    for _ in range(DAY_SECONDS // 3):
        step = rng.randrange(_WALK_PULL_MIN, _WALK_PULL_MAX + 1)
        if val - base > LIVE_ONLINE_BAND:
            step = -step  # too high → pull back down
        elif val - base < -LIVE_ONLINE_BAND:
            step = abs(step)  # too low → pull back up
        elif rng.randrange(2):
            step = -step  # in-band → random direction
        val = max(LIVE_ONLINE_MIN, min(LIVE_ONLINE_MAX, val + step))
        vals.append(val)
    _live_walk_cache[day] = vals
    return vals


def _live_online(now_s):
    # Independent 3s cycle. A mean-reverting random walk seeded from the UTC
    # day: the value starts near 190,000, and every completed 3-second tick
    # moves it up or down by a deterministic ±400–500 step (direction varies
    # naturally). The band keeps it hovering around the 180,000+ base instead
    # of drifting away, hard floors/caps guarantee [150,000, 600,000], and the
    # result is a pure function of the server clock — identical for every
    # user, no mutable state, survives refresh/logout/login, and shares no
    # interval with the 5s/10s cycles below.
    day = now_s // 86400
    tick_index = (now_s % 86400) // 3
    return _live_walk(day)[tick_index]


def _tasks_completed_today(now_s):
    # Independent 5s cycle inside its own persistent 24h window (anchored to
    # UTC midnight via now_s % 86400). Starts at 0 at the boundary and adds a
    # deterministic ~10–12 tasks per completed 5s tick, rising gradually to
    # ~200,000 by the end of the day (capped at 200,000 so it can never
    # exceed the approved maximum). The window start is derived from the
    # server clock only, so it never restarts on refresh, logout or login,
    # and every user sees the identical running total.
    day = now_s // 86400
    ticks = (now_s % 86400) // 5
    rng = __import__("random").Random(day * 2)
    return min(200000, sum(rng.randrange(10, 13) for _ in range(ticks)))


def _platform_earnings_activity(now_s):
    # Independent 10s cycle inside its own persistent 24h window (anchored to
    # UTC midnight via now_s % 86400). Starts at $0.00 at the boundary and adds
    # a deterministic ~$4.40–$6.00 per completed 10s tick, rising gradually to
    # a per-day ceiling that is itself chosen deterministically within
    # $40,000–$50,000. The result is permanently capped at that ceiling, so the
    # platform never reports more than the approved daily maximum. Same replay
    # guarantees as the tasks counter above; seeded differently so the two
    # streams are fully uncorrelated.
    day = now_s // 86400
    ticks = (now_s % 86400) // 10
    rng = __import__("random").Random(day * 2 + 1)
    day_max_cents = rng.randrange(4_000_000, 5_000_001)  # $40,000–$50,000
    total_cents = sum(rng.randrange(440, 601) for _ in range(ticks))
    return min(day_max_cents, total_cents) / 100.0


@router.get("/")
async def get_live_stats():
    now_ms = int(time.time() * 1000)
    now_s = now_ms // 1000
    seq = now_s
    events = [_event_for_index(n) for n in range(seq - WINDOW + 1, seq + 1)]
    payload = {
        "server_time": now_ms,
        "seq": seq,
        "live_online": _live_online(now_s),
        "tasks_completed_today": _tasks_completed_today(now_s),
        "platform_earnings_activity": _platform_earnings_activity(now_s),
        "activity": events,
    }
    return JSONResponse(payload, headers={"Cache-Control": "no-store"})
