import os
import re

def remove_classname_attrs(content):
    # 1. Remove standard className="something"
    content = re.sub(r'className="[^"]*"', '', content)
    content = re.sub(r"className='[^']*'", '', content)

    # 2. Remove dynamic className={...}
    while 'className={' in content:
        start = content.find('className={')
        # Find matching brace
        brace_count = 0
        end = -1
        in_string = False
        string_char = ''
        for i in range(start + 10, len(content)):
            char = content[i]
            
            # Handle string literal skipping to avoid counting braces inside strings
            if char in ('"', "'", '`'):
                if not in_string:
                    in_string = True
                    string_char = char
                elif string_char == char:
                    # check if escaped
                    if content[i-1] != '\\':
                        in_string = False
            
            if not in_string:
                if char == '{':
                    brace_count += 1
                elif char == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        end = i
                        break
        
        if end != -1:
            content = content[:start] + content[end+1:]
        else:
            # Prevent infinite loop if unbalanced
            content = content[:start] + content[start+11:]
            
    return content

def strip_all_classnames(dir_path):
    for root, _, files in os.walk(dir_path):
        for file in files:
            if file.endswith(('.tsx', '.ts', '.jsx', '.js')):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()

                new_content = remove_classname_attrs(content)

                if new_content != content:
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(new_content)

if __name__ == "__main__":
    strip_all_classnames(r"c:\Users\sony\OneDrive\Desktop\Zyntra-AI\src")
