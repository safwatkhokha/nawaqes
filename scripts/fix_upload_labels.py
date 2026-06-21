#!/usr/bin/env python3
"""Convert <button onClick={ref.current?.click()}> + <input hidden> patterns to
<label htmlFor="..."> + <input sr-only> — fixes Android WebView file picker.

Strategy:
1. For each component, find patterns where:
   - There's a <button onClick={() => someRef.current?.click()}>...</button>
   - There's an <input ref={someRef} type="file" ... className="sr-only" ...>
2. Convert the button to a label with htmlFor, and ensure the input has a matching id.
3. Add unique IDs to inputs that don't have one.

This handles the most common upload patterns: single-image upload buttons.
For multi-input cases (CreatePost with story + main), we need to handle each separately.
"""
import re
import os
import glob

# Process these critical upload components
COMPONENTS = [
    'src/components/CreatePost.tsx',
    'src/components/PostCard.tsx',
    'src/components/ProfilePage.tsx',
    'src/components/CreateMarketListing.tsx',
    'src/components/EditPostModal.tsx',
    'src/components/PostDetailPage.tsx',
    'src/components/MessagesPage.tsx',
    'src/components/WalletPage.tsx',
    'src/components/WalletCard.tsx',
    'src/components/MyPage.tsx',
    'src/components/ComplaintPage.tsx',
    'src/components/VideoRecorder.tsx',
]

# Patterns:
# PATTERN 1: <button onClick={() => someRef.current?.click()} ...> ... </button>
# Convert to: <label htmlFor="<someRef>-input" ...> ... </label>
# Then ensure the matching <input ref={someRef} has id="<someRef>-input"

BUTTON_PATTERN = re.compile(
    r'<button\s+([^>]*?)onClick=\{\(\)\s*=>\s*(\w+)\.current\?\.click\(\)\}([^>]*?)>(.*?)</button>',
    re.DOTALL
)

# Simpler pattern with setTimeout wrapper
BUTTON_PATTERN_SETTIMEOUT = re.compile(
    r'<button\s+([^>]*?)onClick=\{\(\)\s*=>\s*\{\s*setTimeout\(\(\)\s*=>\s*(\w+)\.current\?\.click\(\),\s*\d+\s*\);\s*\}\}([^>]*?)>(.*?)</button>',
    re.DOTALL
)

# Multi-statement pattern: onClick={() => { setIsOpen(true); setTimeout(() => fileInputRef.current?.click(), 100); }}
# We just want to convert these to labels — keep the other actions in onClick
BUTTON_PATTERN_MULTI = re.compile(
    r'<button\s+([^>]*?)onClick=\{\(\)\s*=>\s*\{([^}]*?(\w+)\.current\?\.click\(\)[^}]*?)\}\}([^>]*?)>(.*?)</button>',
    re.DOTALL
)

# Find input ref={someRef} type="file" — add id if not present
INPUT_REF_PATTERN = re.compile(
    r'(<input\s+)(ref=\{(\w+)\}[^>]*?)(\s*type="file"[^>]*?)(/?>)',
    re.DOTALL
)

# Find input with id already
INPUT_WITH_ID = re.compile(
    r'<input\s+[^>]*?id="([^"]+)"[^>]*?ref=\{(\w+)\}[^>]*?type="file"',
    re.DOTALL
)

def fix_component(fpath):
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # Step 1: Collect existing input IDs and their refs
    existing_ids = {}  # refName → id
    for match in INPUT_WITH_ID.finditer(content):
        existing_ids[match.group(2)] = match.group(1)
    
    # Step 2: Add IDs to file inputs that don't have them
    def add_id_to_input(match):
        prefix = match.group(1)
        ref_part = match.group(2)
        ref_name = match.group(3)
        type_part = match.group(4)
        closing = match.group(5)
        
        # If already has id, don't add another
        if 'id=' in ref_part:
            return match.group(0)
        
        # Generate id from ref name
        new_id = f"{ref_name}-input"
        existing_ids[ref_name] = new_id
        
        # Add id attribute
        return f"{prefix}id=\"{new_id}\" {ref_part}{type_part}{closing}"
    
    content = INPUT_REF_PATTERN.sub(add_id_to_input, content)
    
    # Step 3: Convert <button onClick={ref.click()}> to <label htmlFor="ref-input">
    # PATTERN 1: simple case
    def convert_simple_button(match):
        before_attrs = match.group(1)
        ref_name = match.group(2)
        after_attrs = match.group(3)
        inner = match.group(4)
        
        # Remove type="button" if present (labels don't have type)
        attrs = (before_attrs + after_attrs).replace('type="button"', '').strip()
        # Add cursor pointer if not present
        if 'cursor' not in attrs:
            attrs += ' style={{cursor:"pointer"}}' if 'style=' not in attrs else ''
        
        # Get the matching id for this ref
        input_id = existing_ids.get(ref_name, f"{ref_name}-input")
        
        # If button has a title attribute, keep it as aria-label on label
        title_match = re.search(r'title="([^"]+)"', attrs)
        aria_attr = f' aria-label="{title_match.group(1)}"' if title_match else ''
        attrs = re.sub(r'\s*title="[^"]+"', '', attrs)
        
        return f'<label htmlFor="{input_id}"{aria_attr} {attrs}>{inner}</label>'
    
    content = BUTTON_PATTERN.sub(convert_simple_button, content)
    
    # PATTERN 2: setTimeout wrapper
    def convert_settimeout_button(match):
        before_attrs = match.group(1)
        ref_name = match.group(2)
        after_attrs = match.group(3)
        inner = match.group(4)
        
        attrs = (before_attrs + after_attrs).replace('type="button"', '').strip()
        if 'cursor' not in attrs and 'style=' not in attrs:
            attrs += ' style={{cursor:"pointer"}}'
        
        input_id = existing_ids.get(ref_name, f"{ref_name}-input")
        
        return f'<label htmlFor="{input_id}" {attrs}>{inner}</label>'
    
    content = BUTTON_PATTERN_SETTIMEOUT.sub(convert_settimeout_button, content)
    
    # PATTERN 3: multi-statement — keep other actions, just convert button → label
    # This is tricky because labels don't have onClick the same way; but we can keep
    # the onClick on the label — it will fire AND the htmlFor will also fire, causing double-open.
    # So for these cases, we keep the button but the input already has sr-only (fixed earlier).
    # Actually, for multi-statement patterns that include setIsOpen(true), we need to keep them
    # as buttons with onClick because labels can't easily run multiple side effects.
    # In this case, we ensure the input has sr-only (already done) and the button stays.
    # The double-open issue is from onClick firing input.click() — this works fine on web.
    # On Android WebView, calling input.click() from button onClick can fail silently.
    # 
    # BEST FIX for multi-statement cases: convert to label + use onPointerDown for the other actions
    # But that's risky. For now, keep as button — most cases are single-statement and will be fixed.
    
    if content != original:
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

changed = 0
for fpath in COMPONENTS:
    full_path = os.path.join('/home/z/my-project/nawaqes', fpath)
    if not os.path.exists(full_path):
        print(f"SKIP: {fpath}")
        continue
    if fix_component(full_path):
        print(f"FIXED: {fpath}")
        changed += 1
    else:
        print(f"NO CHANGE: {fpath}")

print(f"\nTotal: {changed} components fixed")
