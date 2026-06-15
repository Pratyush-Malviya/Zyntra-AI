import os
import re

def clean_classes(class_string):
    classes = class_string.split()
    new_classes = []
    for c in classes:
        # Strip exact match classes
        if c in ['glass', 'bg-surface-alt', 'text-white', 'text-slate-100', 'text-slate-200', 'text-slate-300', 'text-slate-400', 'text-slate-700', 'text-slate-900']:
            if 'text-slate' in c or 'text-white' in c:
                if 'text-text' not in new_classes:
                    new_classes.append('text-text')
            continue
            
        # Strip prefixes
        if c.startswith('dark:'): continue
        if c.startswith('shadow-'): continue
        if c.startswith('glow-'): continue
        if c.startswith('bg-gradient-'): continue
        if c.startswith('from-'): continue
        if c.startswith('to-'): continue
        if c.startswith('via-'): continue
        if c.startswith('backdrop-blur'): continue
        if c.startswith('blur-'): continue
        
        # Regex matches for custom hex colors
        if re.match(r'bg-\[#[a-fA-F0-9]+\]', c): continue
        if re.match(r'text-\[#[a-fA-F0-9]+\]', c): continue
        if re.match(r'border-\[#[a-fA-F0-9]+\]', c): continue
        
        # Replace specific colors with brand/neutral
        if c.startswith('bg-slate-') or c.startswith('bg-zinc-'):
            if 'bg-surface' not in new_classes:
                new_classes.append('bg-surface')
            continue
            
        if 'border-white/' in c or 'border-slate-' in c or 'border-brand/' in c:
            if 'border-border' not in new_classes:
                new_classes.append('border-border')
            continue
            
        # Handle rounded corners globally
        if c.startswith('rounded-') and c != 'rounded-full':
            if 'rounded-xl' not in new_classes:
                new_classes.append('rounded-xl') # Mapped to 21px globally
            continue
            
        if c == 'rounded':
            if 'rounded-xl' not in new_classes:
                new_classes.append('rounded-xl')
            continue

        new_classes.append(c)
        
    # Deduplicate while preserving order
    seen = set()
    result = []
    for c in new_classes:
        if c not in seen:
            seen.add(c)
            result.append(c)
            
    return " ".join(result)

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find all className="..." or className={`...`}
    # We'll use a regex that matches className attributes and cleans their contents.
    
    def replace_class_string(match):
        prefix = match.group(1)
        quote = match.group(2)
        classes = match.group(3)
        suffix = match.group(4)
        
        cleaned = clean_classes(classes)
        return f'{prefix}{quote}{cleaned}{suffix}'

    # Match simple className="..."
    new_content = re.sub(r'(className=)(["\'])(.*?)(["\'])', replace_class_string, content)
    
    # Match template literals className={`...`}
    def replace_template_literal(match):
        prefix = match.group(1)
        classes = match.group(2)
        suffix = match.group(3)
        
        # Split by ${...} to preserve JS expressions
        parts = re.split(r'(\$\{[^}]+\})', classes)
        cleaned_parts = []
        for part in parts:
            if part.startswith('${'):
                cleaned_parts.append(part)
            else:
                cleaned_parts.append(clean_classes(part))
                
        return f'{prefix}{"".join(cleaned_parts)}{suffix}'
        
    new_content = re.sub(r'(className=\{`)(.*?)(`\})', replace_template_literal, new_content)

    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated: {filepath}")

def main():
    src_dir = r"c:\Users\sony\OneDrive\Desktop\Zyntra-AI\src"
    for root, dirs, files in os.walk(src_dir):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                process_file(os.path.join(root, file))

if __name__ == "__main__":
    main()
