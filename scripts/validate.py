import json, sys, os, collections, re
ID = sys.argv[1]
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", ID)
errs, warns = [], []
def load(p):
    try:
        return json.load(open(p, encoding="utf-8"))
    except Exception as e:
        errs.append(f"{p}: cannot parse JSON: {e}"); return None
n = load(f"{D}/notes.json")
if n:
    for k in ["id","code","name","short","category","tagline","eli5","whoNeeds","careerValue","pattern","simulator","chapters","formulas","numbersToRemember","glossary","quickRevision","studyPlan","examStrategy"]:
        if k not in n: errs.append(f"notes.json missing key {k}")
    if n.get("id") != ID: errs.append("notes.id mismatch")
    s = n.get("simulator", {})
    for k in ["questions","durationMin","passPct","negativeFraction"]:
        if k not in s: errs.append(f"simulator missing {k}")
    chs = n.get("chapters", [])
    if len(chs) < 3: errs.append("too few chapters")
    for c in chs:
        for k in ["no","title","weight","emoji","summary","story","keyPoints","mustRemember","examTip","trap"]:
            if k not in c: errs.append(f"chapter {c.get('no')} missing {k}")
        if len(c.get("keyPoints", [])) < 6: warns.append(f"chapter {c.get('no')} has <6 keyPoints")
    if len(n.get("quickRevision", [])) < 20: warns.append("quickRevision < 20")
    chapter_nos = {c.get("no") for c in chs}
else:
    chapter_nos = set()
allq, keys, ids = [], collections.Counter(), set()
for i in range(1, 8):
    m = load(f"{D}/mock-{i}.json")
    if not m: continue
    lvl = "easy" if i <= 5 else "tough"
    if m.get("level") != lvl: errs.append(f"mock-{i} level should be {lvl}")
    qs = m.get("questions", [])
    want = 25 if i <= 5 else 30
    if len(qs) != want: errs.append(f"mock-{i} has {len(qs)} questions, want {want}")
    cases = collections.Counter()
    for q in qs:
        qid = q.get("id")
        if qid in ids: errs.append(f"duplicate id {qid}")
        ids.add(qid)
        for k in ["id","chapter","difficulty","q","options","answer","explanation","hints"]:
            if k not in q: errs.append(f"{qid} missing {k}")
        if len(q.get("options", [])) != 4: errs.append(f"{qid} needs 4 options")
        if len(q.get("hints", [])) != 4: errs.append(f"{qid} needs 4 hints")
        if q.get("answer") not in (0,1,2,3): errs.append(f"{qid} bad answer")
        if q.get("difficulty") not in ("easy","medium","hard"): errs.append(f"{qid} bad difficulty")
        if chapter_nos and q.get("chapter") not in chapter_nos: errs.append(f"{qid} chapter {q.get('chapter')} not in notes")
        if len(set(o.strip().lower() for o in q.get("options", []))) != len(q.get("options", [])): errs.append(f"{qid} duplicate options")
        if q.get("case"): cases[q["case"]] += 1
        keys[q.get("answer")] += 1
        allq.append(re.sub(r"\W+", " ", q.get("q", "").lower()).strip())
    if i >= 6 and n and "case" in json.dumps(n.get("pattern", {})).lower() and len(cases) < 2:
        warns.append(f"mock-{i}: real exam has caselets but fewer than 2 here")
dup = [k for k, v in collections.Counter(allq).items() if v > 1]
if dup: errs.append(f"{len(dup)} duplicate question texts, e.g. {dup[0][:80]}")
tot = sum(keys.values())
if tot:
    for k in range(4):
        if keys[k] / tot < 0.17 or keys[k] / tot > 0.33: warns.append(f"answer key {k} share {keys[k]/tot:.0%} (aim 20-30%)")
print(f"{ID}: {tot} questions, key spread {dict(sorted(keys.items()))}")
for w in warns: print("WARN", w)
for e in errs: print("ERROR", e)
print("OK" if not errs else f"{len(errs)} errors")
