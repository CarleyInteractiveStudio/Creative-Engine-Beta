import re

def check_nesting(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Simplificar para evitar problemas de regex
    tags = re.findall(r'<(/?(?:div|main|section|fieldset|ul|li|span|button|p|textarea|h1|h2|h3|h4|h5|h6|a|label|input|select|option))', content)

    stack = []
    for tag in tags:
        if tag.startswith('/'):
            if not stack:
                # print(f"Error: stray closing tag <{tag}>")
                continue
            last = stack.pop()
            if last != tag[1:]:
                # print(f"Error: Mismatched tags. Expected </{last}>, found <{tag}>")
                pass
        else:
            stack.append(tag)

    # Solo nos interesan div y main para estructura crítica
    div_main_stack = []
    tags = re.findall(r'<(/?(?:div|main))', content)
    for tag in tags:
        if tag.startswith('/'):
            if not div_main_stack:
                print(f"Error: stray closing tag <{tag}>")
                continue
            last = div_main_stack.pop()
            if last != tag[1:]:
                print(f"Error: Mismatched div/main. Expected </{last}>, found <{tag}>")
        else:
            div_main_stack.append(tag)

    if div_main_stack:
        print(f"Error: div/main left on stack: {div_main_stack}")
    else:
        print("Nesting of div/main seems correct.")

check_nesting('editor.html')
