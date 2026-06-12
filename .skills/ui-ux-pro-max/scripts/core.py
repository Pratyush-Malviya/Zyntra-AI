#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import csv, re, json, sys, io
from pathlib import Path
from math import log
from collections import defaultdict

DATA_DIR = Path(__file__).parent.parent / "data"
MAX_RESULTS = 3

CSV_CONFIG = {
    "style": {"file": "styles.csv", "search_cols": ["Style Category", "Keywords", "Best For", "Type", "AI Prompt Keywords"], "output_cols": ["Style Category", "Type", "Keywords", "Primary Colors", "Effects & Animation", "Best For", "Light Mode ✓", "Dark Mode ✓", "Performance", "Accessibility", "Framework Compatibility", "Complexity", "AI Prompt Keywords", "CSS/Technical Keywords", "Implementation Checklist", "Design System Variables"]},
    "color": {"file": "colors.csv", "search_cols": ["Product Type", "Notes"], "output_cols": ["Product Type", "Primary", "On Primary", "Secondary", "On Secondary", "Accent", "On Accent", "Background", "Foreground", "Card", "Card Foreground", "Muted", "Muted Foreground", "Border", "Destructive", "On Destructive", "Ring", "Notes"]},
    "chart": {"file": "charts.csv", "search_cols": ["Data Type", "Keywords", "Best Chart Type", "When to Use", "When NOT to Use", "Accessibility Notes"], "output_cols": ["Data Type", "Keywords", "Best Chart Type", "Secondary Options", "When to Use", "When NOT to Use", "Data Volume Threshold", "Color Guidance", "Accessibility Grade", "Accessibility Notes", "A11y Fallback", "Library Recommendation", "Interactive Level"]},
    "landing": {"file": "landing.csv", "search_cols": ["Pattern Name", "Keywords", "Conversion Optimization", "Section Order"], "output_cols": ["Pattern Name", "Keywords", "Section Order", "Primary CTA Placement", "Color Strategy", "Conversion Optimization"]},
    "product": {"file": "products.csv", "search_cols": ["Product Type", "Keywords", "Primary Style Recommendation", "Key Considerations"], "output_cols": ["Product Type", "Keywords", "Primary Style Recommendation", "Secondary Styles", "Landing Page Pattern", "Dashboard Style (if applicable)", "Color Palette Focus"]},
    "ux": {"file": "ux-guidelines.csv", "search_cols": ["Category", "Issue", "Description", "Platform"], "output_cols": ["Category", "Issue", "Platform", "Description", "Do", "Don't", "Code Example Good", "Code Example Bad", "Severity"]},
    "typography": {"file": "typography.csv", "search_cols": ["Font Pairing Name", "Category", "Mood/Style Keywords", "Best For", "Heading Font", "Body Font"], "output_cols": ["Font Pairing Name", "Category", "Heading Font", "Body Font", "Mood/Style Keywords", "Best For", "Google Fonts URL", "CSS Import", "Tailwind Config", "Notes"]},
}

STACK_CONFIG = {
    "react": {"file": "stacks/react.csv"}, "nextjs": {"file": "stacks/nextjs.csv"}, "vue": {"file": "stacks/vue.csv"}, "svelte": {"file": "stacks/svelte.csv"}, "astro": {"file": "stacks/astro.csv"}, "swiftui": {"file": "stacks/swiftui.csv"}, "react-native": {"file": "stacks/react-native.csv"}, "flutter": {"file": "stacks/flutter.csv"}, "nuxtjs": {"file": "stacks/nuxtjs.csv"}, "nuxt-ui": {"file": "stacks/nuxt-ui.csv"}, "html-tailwind": {"file": "stacks/html-tailwind.csv"}, "shadcn": {"file": "stacks/shadcn.csv"}, "jetpack-compose": {"file": "stacks/jetpack-compose.csv"}, "threejs": {"file": "stacks/threejs.csv"}, "angular": {"file": "stacks/angular.csv"}, "laravel": {"file": "stacks/laravel.csv"}}
AVAILABLE_STACKS = list(STACK_CONFIG.keys())
_STACK_COLS = {"search_cols": ["Category", "Guideline", "Description", "Do", "Don't"], "output_cols": ["Category", "Guideline", "Description", "Do", "Don't", "Code Good", "Code Bad", "Severity", "Docs URL"]}

class BM25:
    def __init__(self, k1=1.5, b=0.75):
        self.k1, self.b = k1, b
        self.corpus, self.doc_lengths, self.avgdl, self.idf, self.doc_freqs, self.N = [], [], 0, {}, defaultdict(int), 0
    def tokenize(self, text):
        text = re.sub(r'[^\w\s]', ' ', str(text).lower())
        return [w for w in text.split() if len(w) > 2]
    def fit(self, documents):
        self.corpus = [self.tokenize(d) for d in documents]
        self.N = len(self.corpus)
        if self.N == 0: return
        self.doc_lengths = [len(d) for d in self.corpus]
        self.avgdl = sum(self.doc_lengths) / self.N
        for doc in self.corpus:
            seen = set()
            for word in doc:
                if word not in seen: self.doc_freqs[word] += 1; seen.add(word)
        for word, freq in self.doc_freqs.items(): self.idf[word] = log((self.N - freq + 0.5) / (freq + 0.5) + 1)
    def score(self, query):
        query_tokens = self.tokenize(query)
        scores = []
        for idx, doc in enumerate(self.corpus):
            score, doc_len, term_freqs = 0, self.doc_lengths[idx], defaultdict(int)
            for word in doc: term_freqs[word] += 1
            for token in query_tokens:
                if token in self.idf:
                    tf = term_freqs[token]
                    numerator = tf * (self.k1 + 1)
                    denominator = tf + self.k1 * (1 - self.b + self.b * doc_len / self.avgdl)
                    score += self.idf[token] * numerator / denominator
            scores.append((idx, score))
        return sorted(scores, key=lambda x: x[1], reverse=True)

def _load_csv(filepath):
    with open(filepath, 'r', encoding='utf-8') as f: return list(csv.DictReader(f))

def _search_csv(filepath, search_cols, output_cols, query, max_results):
    if not filepath.exists(): return []
    data = _load_csv(filepath)
    documents = [" ".join(str(row.get(col, "")) for col in search_cols) for row in data]
    bm25 = BM25(); bm25.fit(documents); ranked = bm25.score(query)
    results = []
    for idx, score in ranked[:max_results]:
        if score > 0: results.append({col: data[idx].get(col, "") for col in output_cols if col in data[idx]})
    return results

def detect_domain(query):
    q = query.lower()
    keywords = {
        "color": ["color","palette","hex","#","rgb","token","semantic","accent"], "chart": ["chart","graph","visualization","trend","bar","pie"], "landing": ["landing","page","cta","conversion","hero","testimonial","pricing"], "product": ["saas","ecommerce","dashboard","crm","fintech","healthcare","gaming","portfolio"], "style": ["style","design","ui","minimalism","glassmorphism","neumorphism","brutalism","dark mode"], "ux": ["ux","usability","accessibility","wcag","touch","scroll","keyboard"], "typography": ["font","typography","serif","sans","monospace","typeface"], "icons": ["icon","icons","lucide","heroicons","svg"], "react": ["react","next.js","nextjs","suspense","memo","usecallback"], "web": ["aria","focus","outline","semantic","form","input"]
    }
    scores = {d: sum(1 for kw in kws if re.search(r'\b' + re.escape(kw) + r'\b', q)) for d, kws in keywords.items()}
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "style"

def search(query, domain=None, max_results=MAX_RESULTS):
    if domain is None: domain = detect_domain(query)
    config = CSV_CONFIG.get(domain, CSV_CONFIG["style"])
    filepath = DATA_DIR / config["file"]
    if not filepath.exists(): return {"error": f"File not found: {filepath}", "domain": domain}
    results = _search_csv(filepath, config["search_cols"], config["output_cols"], query, max_results)
    return {"domain": domain, "query": query, "file": config["file"], "count": len(results), "results": results}

def search_stack(query, stack, max_results=MAX_RESULTS):
    if stack not in STACK_CONFIG: return {"error": f"Unknown stack: {stack}", "stack": stack}
    filepath = DATA_DIR / STACK_CONFIG[stack]["file"]
    if not filepath.exists(): return {"error": f"Stack file not found: {filepath}", "stack": stack}
    results = _search_csv(filepath, _STACK_COLS["search_cols"], _STACK_COLS["output_cols"], query, max_results)
    return {"domain": "stack", "stack": stack, "query": query, "file": STACK_CONFIG[stack]["file"], "count": len(results), "results": results}
