import random
import string
import json
import hashlib
from datetime import date, datetime, timedelta
from typing import Optional, List, Dict, Any
from decimal import Decimal
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.generated_task import GeneratedTask
from app.models.task_type import TaskType
from app.models.investments import Investment
from app.models.package import Package


def _seed_for_user(user_id: int, task_date: date, extra: str = "") -> int:
    raw = f"{user_id}-{task_date.isoformat()}-{extra}"
    return int(hashlib.md5(raw.encode()).hexdigest()[:8], 16)


def _ensure_dict(val):
    if isinstance(val, dict):
        return val
    if isinstance(val, str):
        try:
            return json.loads(val)
        except (json.JSONDecodeError, TypeError):
            return {}
    return {}


def _ensure_list(val):
    if isinstance(val, list):
        return val
    if isinstance(val, str):
        try:
            return json.loads(val)
        except (json.JSONDecodeError, TypeError):
            return []
    return []


class BaseGenerator:
    def generate(self, difficulty: str, params: dict, seed: int) -> dict:
        raise NotImplementedError


class CodeTypingGenerator(BaseGenerator):
    CODE_SNIPPETS = {
        "easy": [
            "const x = 42;",
            "let name = 'hello';",
            "return true;",
            "if (x > 0) {}",
            "print('done')",
            "x = x + 1;",
            "count += 1;",
            "flag = False",
            "list.append(1)",
            "val += 1",
        ],
        "medium": [
            "function add(a, b) { return a + b; }",
            "for (let i = 0; i < n; i++) {}",
            "while (x != 0) { x--; }",
            "try: result = data['key']",
            "arr.filter(x => x > 0)",
            "obj.hasOwnProperty('name')",
            "return arr.map(x => x * 2)",
            "const [first, ...rest] = arr;",
        ],
        "hard": [
            "async function fetchData(url) { const r = await fetch(url); return r.json(); }",
            "const memo = fn => { const c = {}; return (...a) => c[a] || (c[a] = fn(...a)); };",
            "arr.reduce((acc, val) => acc + val, 0)",
            "Object.entries(obj).map(([k, v]) => ({ id: k, ...v }))",
            "new Promise((resolve, reject) => { if (ok) resolve(data); else reject(err); })",
            "dict.get(key, {}).get('nested', default)",
        ],
    }

    def generate(self, difficulty: str, params: dict, seed: int) -> dict:
        rng = random.Random(seed)
        snippets = self.CODE_SNIPPETS.get(difficulty, self.CODE_SNIPPETS["medium"])
        code = rng.choice(snippets)
        return {
            "type": "code_typing",
            "question": "Type the following code exactly as shown:",
            "display_content": code,
            "input_type": "text_input",
            "answer": code,
            "case_sensitive": True,
            "time_limit_seconds": params.get("time_limit_seconds", 30),
        }


class MathChallengeGenerator(BaseGenerator):
    def generate(self, difficulty: str, params: dict, seed: int) -> dict:
        rng = random.Random(seed)
        ops = params.get("operations", ["+", "-", "*"])

        if difficulty == "easy":
            a, b = rng.randint(1, 50), rng.randint(1, 50)
            op = rng.choice(["+", "-"])
            if op == "-" and a < b:
                a, b = b, a
        elif difficulty == "hard":
            a, b = rng.randint(10, 999), rng.randint(2, 12)
            op = rng.choice(["*", "+", "-"])
        else:
            a, b = rng.randint(5, 200), rng.randint(2, 50)
            op = rng.choice(ops)

        if op == "+":
            answer = a + b
        elif op == "-":
            answer = a - b
        elif op == "*":
            answer = a * b
        else:
            answer = a + b

        question = f"What is {a} {op} {b}?"
        options = [str(answer)]
        while len(options) < 4:
            offset = rng.randint(-10, 10)
            if offset != 0 and str(answer + offset) not in options:
                options.append(str(answer + offset))
        rng.shuffle(options)

        return {
            "type": "math_challenge",
            "question": question,
            "input_type": "multiple_choice",
            "options": options,
            "answer": str(answer),
            "time_limit_seconds": params.get("time_limit_seconds", 30),
        }


class CharacterMatchingGenerator(BaseGenerator):
    def generate(self, difficulty: str, params: dict, seed: int) -> dict:
        rng = random.Random(seed)
        length = {"easy": 4, "medium": 6, "hard": 8}.get(difficulty, 6)
        chars = string.ascii_uppercase + string.digits
        sequence = "".join(rng.choices(chars, k=length))
        target_idx = rng.randint(0, length - 1)
        target_char = sequence[target_idx]

        question = f"In the sequence below, what character is at position {target_idx + 1}?"
        options = [target_char]
        while len(options) < 4:
            c = rng.choice(chars)
            if c not in options:
                options.append(c)
        rng.shuffle(options)

        return {
            "type": "character_matching",
            "question": question,
            "display_content": " ".join(sequence),
            "input_type": "multiple_choice",
            "options": options,
            "answer": target_char,
            "time_limit_seconds": params.get("time_limit_seconds", 20),
        }


class PatternRecognitionGenerator(BaseGenerator):
    PATTERNS = {
        "easy": [
            ([2, 4, 6, 8], 10, "Even numbers: +2 each step"),
            ([1, 3, 5, 7], 9, "Odd numbers: +2 each step"),
            ([5, 10, 15, 20], 25, "Multiples of 5"),
            ([10, 20, 30, 40], 50, "Multiples of 10"),
            ([1, 4, 9, 16], 25, "Perfect squares"),
        ],
        "medium": [
            ([2, 6, 12, 20], 30, "n*(n+1): +4, +6, +8, +10"),
            ([1, 1, 2, 3, 5], 8, "Fibonacci sequence"),
            ([3, 9, 27, 81], 243, "Powers of 3"),
            ([1, 4, 13, 40], 121, "x3 + 1 pattern"),
            ([1, 2, 4, 7, 11], 16, "Adding increasing numbers"),
        ],
        "hard": [
            ([1, 11, 21, 1211, 111221], None, "Look-and-say sequence"),
            ([2, 3, 5, 7, 11], 13, "Prime numbers"),
            ([1, 4, 9, 16, 25, 36], 49, "Perfect squares"),
            ([1, 8, 27, 64, 125], 216, "Perfect cubes"),
            ([2, 3, 5, 8, 13], 21, "Fibonacci-like: sum of prev two"),
        ],
    }

    def generate(self, difficulty: str, params: dict, seed: int) -> dict:
        rng = random.Random(seed)
        patterns = self.PATTERNS.get(difficulty, self.PATTERNS["medium"])
        sequence, answer, _ = rng.choice(patterns)

        if answer is None:
            answer = sequence[-1]

        question = "What comes next in this sequence?"
        display = ", ".join(str(x) for x in sequence) + ", ?"
        options = [str(answer)]
        while len(options) < 4:
            offset = rng.randint(-5, 15)
            val = answer + offset
            if val != answer and str(val) not in options and val > 0:
                options.append(str(val))
        rng.shuffle(options)

        return {
            "type": "pattern_recognition",
            "question": question,
            "display_content": display,
            "input_type": "multiple_choice",
            "options": options,
            "answer": str(answer),
            "time_limit_seconds": params.get("time_limit_seconds", 30),
        }


class SequenceCompletionGenerator(BaseGenerator):
    def generate(self, difficulty: str, params: dict, seed: int) -> dict:
        rng = random.Random(seed)
        if difficulty == "easy":
            start = rng.randint(1, 20)
            step = rng.randint(2, 5)
            length = 5
        elif difficulty == "hard":
            start = rng.randint(1, 50)
            step = rng.randint(3, 10)
            length = 7
        else:
            start = rng.randint(1, 30)
            step = rng.randint(2, 8)
            length = 6

        seq = [start + i * step for i in range(length)]
        answer = seq[-1]
        display = ", ".join(str(x) for x in seq[:-1]) + ", ?"

        options = [str(answer)]
        while len(options) < 4:
            val = answer + rng.randint(-step * 2, step * 2)
            if val != answer and str(val) not in options and val > 0:
                options.append(str(val))
        rng.shuffle(options)

        return {
            "type": "sequence_completion",
            "question": "Complete this arithmetic sequence:",
            "display_content": display,
            "input_type": "multiple_choice",
            "options": options,
            "answer": str(answer),
            "time_limit_seconds": params.get("time_limit_seconds", 25),
        }


class SymbolMatchingGenerator(BaseGenerator):
    SYMBOLS = "!@#$%^&*()_+-=[]{}|;:',.<>?/~`"

    def generate(self, difficulty: str, params: dict, seed: int) -> dict:
        rng = random.Random(seed)
        length = {"easy": 4, "medium": 6, "hard": 8}.get(difficulty, 6)
        symbols = [rng.choice(self.SYMBOLS) for _ in range(length)]
        target_idx = rng.randint(0, length - 1)
        target = symbols[target_idx]

        question = f"What symbol is at position {target_idx + 1}?"
        display = " ".join(symbols)
        options = [target]
        while len(options) < 4:
            s = rng.choice(self.SYMBOLS)
            if s not in options:
                options.append(s)
        rng.shuffle(options)

        return {
            "type": "symbol_matching",
            "question": question,
            "display_content": display,
            "input_type": "multiple_choice",
            "options": options,
            "answer": target,
            "time_limit_seconds": params.get("time_limit_seconds", 20),
        }


class NumberIdentificationGenerator(BaseGenerator):
    def generate(self, difficulty: str, params: dict, seed: int) -> dict:
        rng = random.Random(seed)
        if difficulty == "easy":
            length = 4
        elif difficulty == "hard":
            length = 8
        else:
            length = 6

        digits = "".join(rng.choices(string.digits, k=length))
        hidden_idx = rng.randint(0, length - 1)
        hidden_digit = digits[hidden_idx]

        display = digits[:hidden_idx] + "_" + digits[hidden_idx + 1:]
        question = f"Which digit is hidden (position {hidden_idx + 1})?"
        options = [hidden_digit]
        while len(options) < 4:
            d = rng.choice(string.digits)
            if d not in options:
                options.append(d)
        rng.shuffle(options)

        return {
            "type": "number_identification",
            "question": question,
            "display_content": display,
            "input_type": "multiple_choice",
            "options": options,
            "answer": hidden_digit,
            "time_limit_seconds": params.get("time_limit_seconds", 20),
        }


class TextVerificationGenerator(BaseGenerator):
    WORDS = [
        "alpha","bravo","charlie","delta","echo","foxtrot","golf","hotel",
        "india","juliet","kilo","lima","mike","november","oscar","papa",
        "quebec","romeo","sierra","tango","uniform","victor","whiskey","xray",
        "yankee","zulu","system","kernel","buffer","matrix","vector","module",
        "binary","cipher","deploy","fusion","hybrid","launch","module","origin",
        "prism","quantum","rex","sigma","tensor","ultra","vertex","xenon",
    ]

    def generate(self, difficulty: str, params: dict, seed: int) -> dict:
        rng = random.Random(seed)
        count = {"easy": 2, "medium": 3, "hard": 4}.get(difficulty, 3)
        words = rng.choices(self.WORDS, k=count)
        display = " ".join(words)
        answer = display.lower()

        return {
            "type": "text_verification",
            "question": "Type the following text exactly:",
            "display_content": display,
            "input_type": "text_input",
            "answer": answer,
            "case_sensitive": False,
            "time_limit_seconds": params.get("time_limit_seconds", 30),
        }


GENERATOR_REGISTRY: Dict[str, BaseGenerator] = {
    "code_typing": CodeTypingGenerator(),
    "math_challenge": MathChallengeGenerator(),
    "character_matching": CharacterMatchingGenerator(),
    "pattern_recognition": PatternRecognitionGenerator(),
    "sequence_completion": SequenceCompletionGenerator(),
    "symbol_matching": SymbolMatchingGenerator(),
    "number_identification": NumberIdentificationGenerator(),
    "text_verification": TextVerificationGenerator(),
}


def get_generator(key: str) -> Optional[BaseGenerator]:
    return GENERATOR_REGISTRY.get(key)


def list_generator_keys() -> List[str]:
    return list(GENERATOR_REGISTRY.keys())


async def generate_tasks_for_user(
    db: AsyncSession,
    user_id: int,
    task_date: date,
    investment: Investment,
    package: Package,
) -> List[GeneratedTask]:
    existing = await db.execute(
        select(GeneratedTask).options(selectinload(GeneratedTask.task_type)).where(
            and_(
                GeneratedTask.user_id == user_id,
                GeneratedTask.date == task_date,
            )
        )
    )
    if existing.scalars().first():
        return list(existing.scalars().all())

    tasks_per_day = package.captcha_required_per_day or 12

    active_types_result = await db.execute(
        select(TaskType).where(TaskType.is_active == True).order_by(TaskType.sort_order)
    )
    active_types = active_types_result.scalars().all()
    if not active_types:
        return []

    generated = []
    base_seed = _seed_for_user(user_id, task_date)

    for i in range(tasks_per_day):
        task_type = active_types[i % len(active_types)]
        rng = random.Random(base_seed + i)
        difficulty = rng.choice(["easy", "medium", "hard"])

        generator = get_generator(task_type.generator_key)
        if not generator:
            continue

        task_seed = base_seed + i * 1000 + hash(task_type.generator_key) % 1000
        payload = generator.generate(difficulty, _ensure_dict(task_type.generator_params), task_seed)
        points = _ensure_dict(task_type.points_config).get(difficulty, 1)

        task = GeneratedTask(
            user_id=user_id,
            task_type_id=task_type.id,
            task_type=task_type,
            investment_id=investment.id,
            date=task_date,
            sort_order=i,
            payload=payload,
            answer=payload["answer"],
            difficulty=difficulty,
            points=points,
            status="pending",
        )
        db.add(task)
        generated.append(task)

    await db.commit()
    for t in generated:
        await db.refresh(t)
        if not t.task_type:
            t.task_type = task_type
    return generated


async def get_or_generate_tasks(
    db: AsyncSession,
    user_id: int,
    task_date: date,
) -> List[GeneratedTask]:
    existing = await db.execute(
        select(GeneratedTask).options(selectinload(GeneratedTask.task_type)).where(
            and_(
                GeneratedTask.user_id == user_id,
                GeneratedTask.date == task_date,
            )
        ).order_by(GeneratedTask.sort_order)
    )
    tasks = list(existing.scalars().all())
    if tasks:
        return tasks

    inv_result = await db.execute(
        select(Investment).where(
            and_(
                Investment.user_id == user_id,
                Investment.status == "active",
            )
        ).order_by(Investment.id.desc())
    )
    investment = inv_result.scalars().first()
    if not investment:
        return []

    pkg_result = await db.execute(
        select(Package).where(Package.name == investment.package_name)
    )
    package = pkg_result.scalars().first()
    if not package:
        return []

    return await generate_tasks_for_user(db, user_id, task_date, investment, package)


async def check_daily_task_completion(
    db: AsyncSession,
    user_id: int,
    task_date: date,
) -> bool:
    tasks = await get_or_generate_tasks(db, user_id, task_date)
    if not tasks:
        return True
    return all(t.status == "completed" for t in tasks)
