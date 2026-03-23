import re

def check_nesting(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    tags = re.findall(r'<(/?(?:div|main|body|html|header|section|fieldset|ul|li|span|button|main|form|legend|p|textarea|ul|hr|canvas|img|iframe|script|select|option|h1|h2|h3|h4|h5|h6|a|label|input|form|fieldset|hr|p|textarea|ul|li|span|button|img|canvas|svg|path|br|hr|cat)))', content)

    # Actually just check div and main to be sure
    tags = re.findall(r'<(/?(?:div|main))', content)

    stack = []
    for tag in tags:
        if tag.startswith('/'):
            if not stack:
                print(f"Error: stray closing tag <{tag}>")
                continue
            last = stack.pop()
            if last != tag[1:]:
                print(f"Error: Mismatched tags. Expected </{last}>, found <{tag}>")
        else:
            # Handle self-closing if any (not in our search)
            stack.append(tag)

    if stack:
        print(f"Error: tags left on stack: {stack}")
    else:
        print("Nesting of div/main seems correct.")

check_nesting('editor.html')
