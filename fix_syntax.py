import re
import os

def fix_file(filepath):
    if not os.path.exists(filepath):
        print(f"Skipping {filepath}, does not exist.")
        return
    with open(filepath, 'r') as f:
        content = f.read()

    # Fix "if (var var.constructor.name === 'Type'" -> "if (var.constructor.name === 'Type')"
    content = re.sub(r'if\s*\(([^ ]+)\s+\1\.constructor\.name\s*===\s*("[^"]+"|\'[^\']+\')\s*', r'if (\1.constructor.name === \2', content)

    # Fix "if (var.constructor.name === 'Type' {" -> "if (var.constructor.name === 'Type') {"
    # This specifically looks for missing closing parenthesis before opening brace
    content = re.sub(r'(if|else if)\s*\(([^)]*constructor\.name\s*===[^)]*)\s*\{', r'\1 (\2) {', content)

    # Fix specific mangled logic in InspectorWindow.js if found
    content = content.replace('newComponent ley.constructor.name', 'newComponent.constructor.name')
    content = content.replace('"UIImage || newComponent ley.constructor.name ===" "UIText', '"UIImage" || newComponent.constructor.name === "UIText"')

    with open(filepath, 'w') as f:
        f.write(content)

files = [
    'js/editor/ui/InspectorWindow.js',
    'js/editor/ui/HierarchyWindow.js',
    'js/editor/MateriaFactory.js',
    'js/engine/SceneManager.js',
    'js/editor.js',
    'js/engine/StandaloneRuntime.js'
]

for f in files:
    print(f"Fixing {f}...")
    fix_file(f)
