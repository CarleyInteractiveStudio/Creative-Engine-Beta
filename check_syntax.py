import sys

with open('js/editor/ui/InspectorWindow.js', 'r') as f:
    content = f.read()

try:
    compile(content, 'js/editor/ui/InspectorWindow.js', 'exec')
    print("No python-detectable syntax errors (Wait, this is JS, Python compile won't work well for JS specifics but might catch basic brace mismatches if lucky, but actually let's use a better approach)")
except Exception as e:
    print(e)

# Let's count backticks and quotes
print(f"Backticks: {content.count('`')}")
print(f"Single quotes: {content.count(\"'\")}")
print(f"Double quotes: {content.count('\"')}")

# A common cause of "missing ) after argument list" in JS template literals is a missing } in ${}
