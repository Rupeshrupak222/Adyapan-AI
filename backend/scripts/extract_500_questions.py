import fitz
import json
import re
import os
import sys

PDF_PATH = r"f:\New folder\Adyapan-AI\docs\curated_easy_dsa_500_questions.pdf"
OUTPUT_JSON = r"f:\New folder\Adyapan-AI\docs\curated_easy_dsa_500_questions.json"

print(f"Opening PDF: {PDF_PATH}")
doc = fitz.open(PDF_PATH)
print(f"Total pages: {len(doc)}")

full_text = "\n".join(page.get_text("text") for page in doc)

# Regex to match question start:
# e.g., "1. Find the Largest Element\nSlug: find-the-largest-element-001 | ..."
pattern = re.compile(r"(?:^|\n)(\d+)\.\s+([^\n]+)\s*\n\s*Slug:\s*([^\n|]+)")
matches = list(pattern.finditer(full_text))

print(f"Found {len(matches)} question headings.")
if len(matches) != 500:
    print(f"WARNING: Expected 500 questions, but found {len(matches)}!")

questions = []

def clean_text(s: str) -> str:
    if not s:
        return ""
    # Replace multiple spaces with a single space, but preserve intended newlines if needed
    lines = [line.strip() for line in s.split("\n")]
    return " ".join([l for l in lines if l]).strip()

def format_stdin(raw_input: str) -> str:
    if not raw_input:
        return ""
    raw = raw_input.strip()
    # In the PDF, inputs with multiple lines are separated by ' | '
    # e.g., "5 | 1 2 3 4 5" -> "5\n1 2 3 4 5"
    if " | " in raw:
        parts = [p.strip() for p in raw.split(" | ")]
        return "\n".join(parts)
    return raw

TOPIC_HINTS = {
    "Arrays": ("Traverse the array sequentially and maintain the required state or running value.", "Consider array indexing and whether in-place operations or additional variables are needed.", "Optimal solution runs in single pass O(N) time with O(1) auxiliary space."),
    "Strings": ("Check character-by-character using string manipulation or ASCII values.", "Watch out for edge cases like case sensitivity, spaces, and empty strings.", "Two-pointer or frequency array provides an efficient O(N) solution."),
    "Searching": ("Determine if the collection is sorted to choose between Linear Search and Binary Search.", "Binary search halves the search space at each step.", "Ensure correct mid calculation to avoid integer overflow and handle not-found edge cases."),
    "Sorting": ("Understand the stability and in-place properties of basic sorting algorithms.", "For small or partially sorted inputs, insertion sort or built-in Timsort is very efficient.", "Target O(N log N) or O(N) depending on value ranges."),
    "Hashing": ("Use a Hash Map or Hash Set to achieve O(1) average lookup and insertion time.", "Store previously seen elements or frequencies to look up complements instantly.", "Be mindful of space complexity trade-offs when storing elements."),
    "Two Pointers & Sliding Window": ("Initialize pointers either at both ends or together as a moving window.", "Move the left or right pointer based on whether the current window condition is satisfied.", "Expands and contracts in a single pass O(N) without nested loops."),
    "Math & Number Theory": ("Look for mathematical patterns, prime factorization, or modulo arithmetic properties.", "Be careful with 32-bit integer overflow; use 64-bit integer types if numbers exceed 10^9.", "Handle zero, negative numbers, and boundary values cleanly."),
    "Recursion": ("Clearly identify the base case(s) where recursion terminates.", "Break the problem into smaller subproblems of identical structure.", "Ensure recursion depth does not exceed call stack limits."),
    "Linked Lists": ("Use dummy head nodes to simplify insertion and deletion at the beginning.", "Maintain current and previous pointer references carefully to avoid losing nodes.", "Fast and slow pointers (Floyd's algorithm) help detect cycles and find middle nodes."),
    "Stacks": ("Stack operates on Last-In, First-Out (LIFO) order.", "Useful for matching parentheses, monotonic sequences, and undo operations.", "Always check if the stack is non-empty before calling pop() or top()."),
    "Queues": ("Queue operates on First-In, First-Out (FIFO) order.", "Ideal for breadth-first traversal, task scheduling, and sliding window buffers.", "Ensure you pop from the front and push to the back."),
    "Binary Trees": ("Tree problems are naturally solved using recursive traversals: Pre-order, In-order, Post-order.", "Consider both depth-first search (DFS) and breadth-first search (BFS using a queue).", "Check null tree and single-node edge cases."),
    "Binary Search Trees": ("In a BST, all keys in the left subtree are smaller, and right subtree keys are larger.", "In-order traversal of a BST yields strictly sorted elements.", "Search, insertion, and deletion run in O(h) where h is the tree height."),
    "Heaps": ("A heap allows O(1) access to min/max and O(log N) insertions/deletions.", "Use min-heap for smallest elements and max-heap for largest elements.", "Great for finding K-th largest or merging sorted streams."),
    "Graphs": ("Represent the graph using an adjacency list for optimal space efficiency.", "Use BFS for shortest path in unweighted graphs, DFS for connectivity and cycles.", "Keep a visited set/array to prevent infinite loops in cyclic graphs."),
    "Greedy": ("Make the locally optimal choice at each step hoping it leads to a global optimum.", "Verify that the greedy choice property and optimal substructure hold.", "Sorting the input first is often the key to greedy problems."),
    "Dynamic Programming": ("Identify overlapping subproblems and optimal substructure.", "Formulate the state dp[i] and define base cases clearly.", "Transition from previous states; space can often be optimized from O(N) to O(1)."),
    "Bit Manipulation": ("Use bitwise operations (&, |, ^, ~, <<, >>) to manipulate individual bits.", "x ^ x = 0 and x ^ 0 = x are useful properties of XOR.", "x & (x - 1) clears the lowest set bit."),
    "Matrices": ("Iterate row by row or column by column using nested loops.", "Be vigilant with grid boundary checks: 0 <= r < R and 0 <= c < C.", "Watch out for diagonal or spiral traversal boundary shifts.")
}

DEFAULT_HINTS = (
    "Carefully analyze the problem constraints and input format before implementing.",
    "Break down the problem into smaller logical steps and trace with sample test cases.",
    "Aim to meet the target time and space complexity without unnecessary overhead."
)

for idx, m in enumerate(matches):
    q_num = int(m.group(1))
    raw_title = m.group(2).strip()
    slug = m.group(3).strip()
    
    start_pos = m.start()
    end_pos = matches[idx + 1].start() if idx + 1 < len(matches) else len(full_text)
    block = full_text[start_pos:end_pos]
    
    # Metadata line
    first_lines = block.split("\n")[:4]
    meta_line = ""
    for l in first_lines:
        if "Category:" in l:
            meta_line = l
            break
            
    cat_m = re.search(r"Category:\s*([^|]+)", meta_line)
    diff_m = re.search(r"Difficulty:\s*([^|]+)", meta_line)
    tags_m = re.search(r"Tags:\s*([^\n]+)", meta_line)
    
    category = cat_m.group(1).strip() if cat_m else "Arrays"
    difficulty = diff_m.group(1).strip() if diff_m else "Easy"
    tags_raw = tags_m.group(1).strip() if tags_m else "arrays, beginner, fundamentals"
    tags = [t.strip().lower() for t in tags_raw.split(",") if t.strip()]
    
    # Statement
    stmt_m = re.search(r"Problem Statement:\s*(.*?)(?=\nConstraints:|\nInput Format:|\nVisible Test)", block, re.DOTALL)
    statement = clean_text(stmt_m.group(1)) if stmt_m else f"Solve the beginner problem: {raw_title}."
    
    # Constraints
    con_m = re.search(r"Constraints:\s*(.*?)(?=\nInput Format:|\nOutput Format:|\nVisible Test)", block, re.DOTALL)
    constraints = clean_text(con_m.group(1)) if con_m else "1 ≤ N ≤ 10^5; values fit in 32-bit signed integers"
    
    # Input Format
    in_m = re.search(r"Input Format:\s*(.*?)(?=\nOutput Format:|\nVisible Test)", block, re.DOTALL)
    input_format = clean_text(in_m.group(1)) if in_m else "The first line contains N. The second line contains N space-separated values."
    
    # Output Format
    out_m = re.search(r"Output Format:\s*(.*?)(?=\nVisible Test)", block, re.DOTALL)
    output_format = clean_text(out_m.group(1)) if out_m else "Print the required answer in the specified format. Do not print labels or extra text."
    
    # Visible Tests
    vis_tests = []
    for vt_idx in [1, 2, 3]:
        vt_m = re.search(rf"Visible Test {vt_idx}:\s*Input:\s*(.*?)\n\s*Expected Output:\s*(.*?)(?=\nVisible Test|\nHidden Test|\nComplexity Target)", block, re.DOTALL)
        if vt_m:
            raw_inp = vt_m.group(1).strip()
            raw_out = vt_m.group(2).strip()
            formatted_inp = format_stdin(raw_inp)
            vis_tests.append({
                "testNumber": vt_idx,
                "input": formatted_inp,
                "expectedOutput": raw_out,
                "rawInput": raw_inp
            })
            
    # Hidden Tests
    hid_tests = []
    for ht_idx in [1, 2, 3]:
        ht_m = re.search(rf"Hidden Test {ht_idx}:\s*(.*?)(?=\nHidden Test|\nComplexity Target|\nMetadata:|$)", block, re.DOTALL)
        if ht_m:
            content = ht_m.group(1).strip()
            h_in_m = re.search(r"Input:\s*(.*?)\n\s*Expected Output:\s*(.*)", content, re.DOTALL)
            if h_in_m:
                raw_inp = h_in_m.group(1).strip()
                raw_out = h_in_m.group(2).strip()
                hid_tests.append({
                    "testNumber": ht_idx,
                    "input": format_stdin(raw_inp),
                    "expectedOutput": raw_out
                })
            else:
                # If descriptive edge case (e.g. Hidden Test 3)
                hid_tests.append({
                    "testNumber": ht_idx,
                    "description": clean_text(content)
                })
                
    # Complexity Target
    comp_m = re.search(r"Complexity Target:\s*(.*?)(?=\nMetadata:|$)", block, re.DOTALL)
    complexity = clean_text(comp_m.group(1)) if comp_m else "O(N)"
    
    # Build Examples for UI display
    examples = []
    for vt in vis_tests:
        examples.append({
            "input": vt["input"],
            "output": vt["expectedOutput"],
            "explanation": f"For input `{vt['rawInput']}`, the computed output is `{vt['expectedOutput']}`."
        })
        
    # Standard external ID: DSA-001 ... DSA-500
    external_id = f"DSA-{q_num:03d}"
    
    # AI Hints
    topic_hints = TOPIC_HINTS.get(category, DEFAULT_HINTS)
    hint_1 = f"{topic_hints[0]} For '{raw_title}', ensure you understand the required output format."
    hint_2 = f"{topic_hints[1]} Consider how the constraints ({constraints}) guide the algorithm choice."
    hint_3 = f"{topic_hints[2]} The target complexity is {complexity}."
    
    # AI Analysis schema matching AICodingService & workspace
    ai_analysis = {
        "problem_explanation": f"### Problem Overview\n\n{statement}\n\n### Input Specification\n{input_format}\n\n### Output Specification\n{output_format}\n\n### Constraints\n`{constraints}`\n\n### Complexity Target\n- Time Complexity: `{complexity}`\n- Space Complexity: `O(1)` or `O(N)` based on implementation.",
        "inputSpecification": input_format,
        "outputSpecification": output_format,
        "constraints": constraints,
        "hint_1": hint_1,
        "hint_2": hint_2,
        "hint_3": hint_3,
        "brute_force": f"A straightforward approach directly follows the problem definition: read the input and evaluate step-by-step. For {category} problems of this type, a basic linear scan or direct simulation verifies correctness.",
        "optimal_approach": f"An optimal approach achieves the target complexity of {complexity} by utilizing standard {category} techniques without redundant allocations.",
        "time_complexity": complexity,
        "space_complexity": "O(1) auxiliary space (or O(N) if building an auxiliary result).",
        "interview_importance": "Core Foundational DSA - Essential problem pattern frequently tested in technical screening interviews.",
        "common_mistakes": [
            "Failing to handle boundary values (empty input, single element, negative integers)",
            "Incorrect parsing of multiline standard input",
            "Off-by-one errors in iteration bounds"
        ],
        "examples": examples,
        "timeLimit": "2.0s",
        "memoryLimit": "256 MB"
    }
    
    # Companies mapping based on category for DSA practice
    companies = ["Amazon", "Microsoft", "Google", "Flipkart", "TCS", "Infosys", "Accenture"]
    # Curate 2-3 companies per question deterministically
    comp_slice = [companies[(q_num + i) % len(companies)] for i in range(3)]
    
    question_obj = {
        "number": q_num,
        "externalId": external_id,
        "slug": slug,
        "title": f"{q_num}. {raw_title}",
        "rawTitle": raw_title,
        "category": category,
        "topic": category,
        "difficulty": difficulty,
        "rating": 1000 + (q_num % 3) * 50,
        "tags": tags,
        "statement": statement,
        "constraints": constraints,
        "inputFormat": input_format,
        "outputFormat": output_format,
        "complexityTarget": complexity,
        "visibleTestCases": vis_tests,
        "hiddenTestCases": hid_tests,
        "examples": examples,
        "aiAnalysis": ai_analysis,
        "companies": comp_slice,
        "timeLimit": "2.0s",
        "memoryLimit": "256 MB",
        "placementImportance": True,
        "interviewImportance": True,
    }
    questions.append(question_obj)

print(f"\nSuccessfully extracted {len(questions)} questions.")

with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
    json.dump(questions, f, indent=2, ensure_ascii=False)

print(f"Saved complete extracted JSON to: {OUTPUT_JSON} ({os.path.getsize(OUTPUT_JSON)} bytes)")
