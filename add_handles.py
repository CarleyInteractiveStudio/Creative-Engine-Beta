import re

with open('editor.html', 'r') as f:
    content = f.read()

# Pattern for panel-header in a floating-panel
# We want to find the end of the panel-header div and insert the handles if they are missing.

panels = re.findall(r'<div id="([^"]+)" class="editor-panel floating-panel[^>]*>.*?<div class="panel-header">.*?</div>', content, re.DOTALL)

for panel_id in panels:
    # Find the specific panel block
    pattern = r'(<div id="' + panel_id + r'" class="editor-panel floating-panel[^>]*>.*?<div class="panel-header">.*?</div>)'
    match = re.search(pattern, content, re.DOTALL)
    if match:
        block = match.group(1)
        if 'resize-handle' not in block:
            handles = """
                <div class="resize-handle" data-direction="n"></div>
                <div class="resize-handle" data-direction="ne"></div>
                <div class="resize-handle" data-direction="e"></div>
                <div class="resize-handle" data-direction="se"></div>
                <div class="resize-handle" data-direction="s"></div>
                <div class="resize-handle" data-direction="sw"></div>
                <div class="resize-handle" data-direction="w"></div>
                <div class="resize-handle" data-direction="nw"></div>"""
            new_block = block + handles
            content = content.replace(block, new_block)

with open('editor.html', 'w') as f:
    f.write(content)
