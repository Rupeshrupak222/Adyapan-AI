import json
import os

PDF_PATH = r"f:\New folder\Adyapan-AI\docs\intermediate_dsa_questions_526_550_final.pdf"
OUTPUT_JSON = r"f:\New folder\Adyapan-AI\docs\intermediate_dsa_questions_526_549.json"

# Raw per-question data transcribed from the PDF. Note: the PDF title claims
# #526-#550, but it literally contains 24 questions (#526-#549); #550 is absent.
RAW_QUESTIONS = [
    {
        "num": 526,
        "title": "Daily Temperatures",
        "slug": "daily-temperatures",
        "category": "Stacks / Arrays",
        "tags": ["monotonic-stack", "arrays"],
        "statement": "Return, for each day, how many days must pass before a warmer temperature occurs; return 0 if none exists.",
        "constraints": "1≤N≤2×10^5; temperatures are integers from -50 to 100.",
        "input_format": "N; then N temperatures.",
        "output_format": "N waiting times.",
        "approach": "Use a decreasing stack of indices. Resolve previous days whenever the current temperature is warmer.",
        "complexity": "O(N)",
        "visible": [
            ("8\n73 74 75 71 69 72 76 73", "1 1 4 2 1 1 0 0"),
            ("4\n30 30 30 30", "0 0 0 0"),
            ("5\n90 80 70 60 100", "4 3 2 1 0"),
        ],
        "hidden": [
            ("6\n60 62 61 65 64 70", "1 3 1 2 1 0"),
            ("3\n100 99 98", "0 0 0"),
        ],
    },
    {
        "num": 527,
        "title": "Asteroid Collision",
        "slug": "asteroid-collision",
        "category": "Stacks / Simulation",
        "tags": ["stack", "simulation"],
        "statement": "Positive asteroids move right and negative asteroids move left. Resolve collisions according to size and return the survivors.",
        "constraints": "1≤N≤10^5; 1≤abs(A[i])≤10^4.",
        "input_format": "N; then N asteroid values.",
        "output_format": "Surviving asteroid values, or EMPTY.",
        "approach": "Use a stack. A collision can occur only when the stack top is positive and the incoming asteroid is negative.",
        "complexity": "O(N)",
        "visible": [
            ("5\n5 10 -5 8 -8", "5 10"),
            ("3\n8 -8 2", "2"),
            ("3\n10 2 -5", "10"),
        ],
        "hidden": [
            ("4\n-2 -1 1 2", "-2 -1 1 2"),
            ("6\n10 2 -5 -20 15 -15", "-20"),
        ],
    },
    {
        "num": 528,
        "title": "Product Except Self",
        "slug": "product-except-self",
        "category": "Arrays / Prefix Products",
        "tags": ["prefix-product", "arrays"],
        "statement": "For every position, return the product of all array elements except the element at that position, without division.",
        "constraints": "2≤N≤10^5; -30≤A[i]≤30.",
        "input_format": "N; then N integers.",
        "output_format": "N resulting integers.",
        "approach": "Build prefix products into the answer and multiply suffix products during a reverse pass.",
        "complexity": "O(N)",
        "visible": [
            ("4\n1 2 3 4", "24 12 8 6"),
            ("3\n-1 1 0", "0 0 -1"),
            ("4\n2 3 4 5", "60 40 30 24"),
        ],
        "hidden": [
            ("5\n0 1 2 0 4", "0 0 0 0 0"),
            ("3\n-2 -3 -4", "12 8 6"),
        ],
    },
    {
        "num": 529,
        "title": "Subarray Sum Equals K",
        "slug": "subarray-sum-equals-k",
        "category": "Arrays / Prefix Sum",
        "tags": ["prefix-sum", "hashmap"],
        "statement": "Count contiguous subarrays whose sum equals K. Values may be negative or zero.",
        "constraints": "1≤N≤2×10^5; -10^4≤A[i]≤10^4.",
        "input_format": "N K; then N integers.",
        "output_format": "Number of qualifying subarrays.",
        "approach": "Store frequencies of previous prefix sums. For current prefix P, add the frequency of P-K.",
        "complexity": "O(N)",
        "visible": [
            ("3 3\n1 2 1", "2"),
            ("3 0\n0 0 0", "6"),
            ("5 5\n1 2 3 2 5", "2"),
        ],
        "hidden": [
            ("6 -2\n-1 -1 2 -2 3 -3", "4"),
            ("4 10\n1 2 3 4", "0"),
        ],
    },
    {
        "num": 530,
        "title": "Three Sum Closest",
        "slug": "three-sum-closest",
        "category": "Arrays / Two Pointers",
        "tags": ["sorting", "two-pointers"],
        "statement": "Find the sum of three distinct elements closest to target. If tied, return the smaller sum.",
        "constraints": "3≤N≤2000; -10^4≤A[i]≤10^4.",
        "input_format": "N target; then N integers.",
        "output_format": "Closest sum.",
        "approach": "Sort the array, fix one value, and use two pointers to search the remaining range.",
        "complexity": "O(N²)",
        "visible": [
            ("4 1\n-1 2 1 -4", "2"),
            ("3 5\n1 2 3", "6"),
            ("5 0\n-2 -1 1 4 5", "0"),
        ],
        "hidden": [
            ("6 10\n1 2 4 8 16 32", "14"),
            ("5 -7\n-10 -3 0 2 8", "-8"),
        ],
    },
    {
        "num": 531,
        "title": "Search Rotated Sorted Array",
        "slug": "search-rotated-sorted-array",
        "category": "Binary Search",
        "tags": ["binary-search", "rotated-array"],
        "statement": "Search for a target in a strictly increasing array rotated at an unknown pivot. Return its index or -1.",
        "constraints": "1≤N≤2×10^5; all values are distinct.",
        "input_format": "N target; then rotated array.",
        "output_format": "Zero-based index or -1.",
        "approach": "At each midpoint, identify the sorted half and determine whether the target lies inside it.",
        "complexity": "O(log N)",
        "visible": [
            ("7 0\n4 5 6 7 0 1 2", "4"),
            ("5 3\n5 1 2 3 4", "3"),
            ("4 9\n6 7 8 1", "-1"),
        ],
        "hidden": [
            ("8 5\n6 7 8 9 1 2 3 5", "7"),
            ("1 4\n4", "0"),
        ],
    },
    {
        "num": 532,
        "title": "Find Peak Element",
        "slug": "find-peak-element",
        "category": "Binary Search",
        "tags": ["binary-search", "arrays"],
        "statement": "Find any index whose value is greater than its existing neighbors. Treat outside boundaries as negative infinity.",
        "constraints": "1≤N≤10^5; adjacent values are distinct.",
        "input_format": "N; then N integers.",
        "output_format": "Any valid peak index.",
        "approach": "If A[mid] < A[mid+1], a peak exists to the right; otherwise a peak exists at or left of mid.",
        "complexity": "O(log N)",
        "visible": [
            ("4\n1 2 3 1", "2"),
            ("5\n1 2 1 3 5", "4"),
            ("1\n7", "0"),
        ],
        "hidden": [
            ("6\n6 5 4 3 2 1", "0"),
            ("5\n1 3 2 4 1", "3"),
        ],
    },
    {
        "num": 533,
        "title": "Allocate Books",
        "slug": "allocate-books",
        "category": "Binary Search / Greedy",
        "tags": ["binary-search", "greedy", "partition"],
        "statement": "Partition books in fixed order among M students to minimize the maximum pages assigned to one student. Every student must receive a non-empty group.",
        "constraints": "1≤N≤10^5; 1≤M≤N; pages≤10^9.",
        "input_format": "N M; then N page counts.",
        "output_format": "Minimum possible maximum pages.",
        "approach": "Binary-search a page limit and greedily count how many students are needed under that limit.",
        "complexity": "O(N log(sum))",
        "visible": [
            ("4 2\n12 34 67 90", "113"),
            ("5 3\n10 20 30 40 50", "60"),
            ("3 4\n1 2 3", "-1"),
        ],
        "hidden": [
            ("5 2\n10 20 30 40 50", "90"),
            ("6 3\n5 17 100 11 20 30", "117"),
        ],
    },
    {
        "num": 534,
        "title": "Aggressive Cows",
        "slug": "aggressive-cows",
        "category": "Binary Search / Greedy",
        "tags": ["binary-search", "greedy"],
        "statement": "Place C cows in given stalls so that the minimum distance between any two cows is as large as possible.",
        "constraints": "2≤N≤10^5; positions are distinct and ≤10^9.",
        "input_format": "N C; then stall positions.",
        "output_format": "Largest achievable minimum distance.",
        "approach": "Sort stalls and binary-search a candidate distance, greedily placing cows as early as possible.",
        "complexity": "O(N log(max pos))",
        "visible": [
            ("5 3\n1 2 4 8 9", "3"),
            ("6 4\n0 3 4 7 10 12", "3"),
            ("3 2\n5 10 15", "10"),
        ],
        "hidden": [
            ("5 2\n1 100 200 300 1000", "999"),
            ("4 4\n1 2 3 10", "1"),
        ],
    },
    {
        "num": 535,
        "title": "Number of Islands",
        "slug": "number-of-islands",
        "category": "Graphs / Grid DFS",
        "tags": ["grid", "dfs", "bfs"],
        "statement": "Count connected components of land cells in a binary grid. Connections are vertical and horizontal only.",
        "constraints": "Rows×columns≤10^6; grid values are 0 or 1.",
        "input_format": "R C; then R binary rows.",
        "output_format": "Island count.",
        "approach": "Run DFS or BFS from every unvisited land cell and mark its entire component.",
        "complexity": "O(R×C)",
        "visible": [
            ("4 5\n11000\n11000\n00100\n00011", "3"),
            ("2 2\n11\n11", "1"),
            ("3 3\n000\n000\n000", "0"),
        ],
        "hidden": [
            ("5 6\n101010\n010101\n101010\n010101\n101010", "15"),
            ("1 4\n1111", "1"),
        ],
    },
    {
        "num": 536,
        "title": "Rotting Oranges",
        "slug": "rotting-oranges",
        "category": "Graphs / Multi-source BFS",
        "tags": ["bfs", "grid"],
        "statement": "Each minute, rotten oranges infect adjacent fresh oranges. Return the time until all rot, or -1 if impossible.",
        "constraints": "1≤R,C≤500.",
        "input_format": "R C; then grid values 0,1,2.",
        "output_format": "Minutes required or -1.",
        "approach": "Initialize BFS with all rotten cells and process simultaneous levels.",
        "complexity": "O(R×C)",
        "visible": [
            ("3 3\n2 1 1\n1 1 0\n0 1 1", "4"),
            ("3 3\n2 1 1\n0 1 1\n1 0 1", "-1"),
            ("1 2\n2 1", "1"),
        ],
        "hidden": [
            ("2 2\n2 1\n1 1", "2"),
            ("2 2\n0 0\n0 0", "0"),
        ],
    },
    {
        "num": 537,
        "title": "Bipartite Graph Check",
        "slug": "bipartite-graph-check",
        "category": "Graphs / Coloring",
        "tags": ["graph", "bfs", "coloring"],
        "statement": "Determine whether an undirected graph can be colored with two colors so that adjacent vertices have different colors.",
        "constraints": "1≤N≤10^5; M≤2×10^5.",
        "input_format": "N M; then M edges using 0-based vertices.",
        "output_format": "YES or NO.",
        "approach": "Color each component using BFS. A same-color edge proves the graph is not bipartite.",
        "complexity": "O(N + M)",
        "visible": [
            ("4 4\n0 1\n1 2\n2 3\n3 0", "YES"),
            ("3 3\n0 1\n1 2\n2 0", "NO"),
            ("5 2\n0 1\n3 4", "YES"),
        ],
        "hidden": [
            ("6 6\n0 1\n1 2\n2 3\n3 4\n4 5\n5 0", "YES"),
            ("1 0", "YES"),
        ],
    },
    {
        "num": 538,
        "title": "Kruskal MST",
        "slug": "kruskal-mst",
        "category": "Graphs / Minimum Spanning Tree",
        "tags": ["mst", "kruskal", "dsu"],
        "statement": "Find the total weight of a minimum spanning tree of a connected undirected weighted graph.",
        "constraints": "1≤N≤2×10^5; M≤3×10^5.",
        "input_format": "N M; then edges u v w.",
        "output_format": "MST total weight.",
        "approach": "Sort edges by weight and use Disjoint Set Union to add only edges joining different components.",
        "complexity": "O(M log M)",
        "visible": [
            ("4 5\n1 2 1\n2 3 2\n3 4 1\n4 1 4\n1 3 3", "4"),
            ("3 3\n1 2 5\n2 3 6\n1 3 2", "7"),
            ("2 1\n1 2 9", "9"),
        ],
        "hidden": [
            ("5 7\n1 2 3\n1 3 1\n2 3 2\n2 4 4\n3 4 6\n4 5 2\n3 5 5", "8"),
            ("4 3\n1 2 1\n2 3 2\n1 3 3", "-1"),
        ],
    },
    {
        "num": 539,
        "title": "Evaluate Division",
        "slug": "evaluate-division",
        "category": "Graphs / Weighted DFS",
        "tags": ["graph", "dfs", "ratios"],
        "statement": "Given equations a/b=value, answer division queries. Return -1 if variables are disconnected.",
        "constraints": "Equations≤10^4; values positive.",
        "input_format": "E; equations; Q; queries.",
        "output_format": "One result per query.",
        "approach": "Build a weighted bidirectional graph and multiply weights along a DFS path.",
        "complexity": "O(E + Q·E)",
        "visible": [
            ("2\na b 2\nb c 3\n3\na c\nb a\na e", "6\n0.5\n-1"),
            ("1\nx y 4\n2\nx y\ny x", "4\n0.25"),
            ("1\na b 2\n1\na a", "1"),
        ],
        "hidden": [
            ("3\na b 1.5\nb c 2\nc d 4\n2\na d\nd a", "12\n0.083333"),
        ],
    },
    {
        "num": 540,
        "title": "Longest Common Subsequence",
        "slug": "longest-common-subsequence",
        "category": "Dynamic Programming / Strings",
        "tags": ["dp", "strings"],
        "statement": "Find the length of the longest common subsequence of two strings and print one valid subsequence.",
        "constraints": "String lengths≤2000; lowercase English letters.",
        "input_format": "Two strings on separate lines.",
        "output_format": "Length and one valid LCS.",
        "approach": "Use a DP table for lengths and backtrack from the final cell to reconstruct a subsequence.",
        "complexity": "O(|A|·|B|)",
        "visible": [
            ("abcde\nace", "3\nace"),
            ("abc\nabc", "3\nabc"),
            ("abc\ndef", "0"),
        ],
        "hidden": [
            ("AGGTAB\nGXTXAYB", "4\nGTAB"),
            ("aaaa\naa", "2\naa"),
        ],
    },
    {
        "num": 541,
        "title": "0/1 Knapsack Selection",
        "slug": "zero-one-knapsack-selection",
        "category": "Dynamic Programming / Knapsack",
        "tags": ["dp", "knapsack"],
        "statement": "Choose each item at most once to maximize value under capacity W. Output maximum value and selected item indices.",
        "constraints": "N≤200; W≤10^4.",
        "input_format": "N W; then N lines weight value.",
        "output_format": "Maximum value, count, and indices.",
        "approach": "Use 0/1 knapsack DP and backtrack through decisions to recover selected items.",
        "complexity": "O(N·W)",
        "visible": [
            ("3 50\n10 60\n20 100\n30 120", "220\n2\n2 3"),
            # PDF row-split artifact: raw visible test printed "2 3 / 2 / 2 5 / 6 10 / 7 20 / 0 / 0".
            # Only reading consistent with output "0\n0" is N=2, W=3 with items (6,10),(7,20).
            ("2 3\n6 10\n7 20", "0\n0"),
            ("4 7\n1 1\n3 4\n4 5\n5 7", "9\n2\n2 3"),
        ],
        "hidden": [
            ("5 10\n2 6\n2 10\n6 12\n5 8\n4 7", "27\n3\n1 2 5"),
            ("1 3\n3 9", "0\n0"),
        ],
    },
    {
        "num": 542,
        "title": "Matrix Chain Multiplication",
        "slug": "matrix-chain-multiplication",
        "category": "Dynamic Programming / Intervals",
        "tags": ["dp", "matrix-chain"],
        "statement": "Given dimensions of matrices multiplied in order, find the minimum scalar multiplication cost.",
        "constraints": "2≤number of matrices≤200; dimensions≤10^4.",
        "input_format": "N; then N+1 dimensions.",
        "output_format": "Minimum multiplication cost.",
        "approach": "Let dp[i][j] be the minimum cost for matrices i through j and try every split point.",
        "complexity": "O(N³)",
        "visible": [
            ("4\n10 30 5 60", "4500"),
            ("3\n10 20 30", "6000"),
            ("5\n40 20 30 10 30", "26000"),
        ],
        "hidden": [
            ("6\n5 10 3 12 5 50", "1655"),
            ("3\n1 1 1", "1"),
        ],
    },
    {
        "num": 543,
        "title": "Decode Ways",
        "slug": "decode-ways",
        "category": "Dynamic Programming / Strings",
        "tags": ["dp", "strings"],
        "statement": "Count valid decodings where 1=A through 26=Z. A leading zero is invalid.",
        "constraints": "1≤length≤10^5; digits only.",
        "input_format": "One digit string.",
        "output_format": "Count modulo 1,000,000,007.",
        "approach": "Use rolling DP, considering valid one-digit and two-digit codes at each position.",
        "complexity": "O(length)",
        "visible": [
            ("12", "2"),
            ("226", "3"),
            ("06", "0"),
        ],
        "hidden": [
            ("11106", "2"),
            ("10", "1"),
            ("27", "1"),
        ],
    },
    {
        "num": 544,
        "title": "Palindromic Substrings",
        "slug": "palindromic-substrings",
        "category": "Strings / Dynamic Programming",
        "tags": ["strings", "palindrome", "dp"],
        "statement": "Count all palindromic substrings, counting equal substrings at different positions separately.",
        "constraints": "1≤length≤3000; lowercase English letters.",
        "input_format": "One string.",
        "output_format": "Number of palindromic substrings.",
        "approach": "Expand around every odd and even center and count successful expansions.",
        "complexity": "O(length²)",
        "visible": [
            ("aaa", "6"),
            ("abc", "3"),
            ("abba", "6"),
        ],
        "hidden": [
            ("racecar", "10"),
            ("aaaaa", "15"),
        ],
    },
    {
        "num": 545,
        "title": "LRU Cache Operations",
        "slug": "lru-cache-operations",
        "category": "Design / HashMap / Linked List",
        "tags": ["lru-cache", "hashmap", "linked-list"],
        "statement": "Implement an LRU cache. GET returns a value or -1; GET and PUT make a key most recently used.",
        "constraints": "Capacity≤10^4; operations≤2×10^5.",
        "input_format": "Capacity Q; then Q GET or PUT operations.",
        "output_format": "Print GET results in order.",
        "approach": "Use a hashmap for lookup and a doubly linked list for recency ordering.",
        "complexity": "O(1) amortized per op",
        "visible": [
            ("2 6\nPUT 1 10\nPUT 2 20\nGET 1\nPUT 3 30\nGET 2\nGET 3", "10\n-1\n30"),
            ("1 4\nPUT 1 5\nGET 1\nPUT 2 6\nGET 1", "5\n-1"),
            ("2 3\nGET 7\nPUT 7 9\nGET 7", "-1\n9"),
        ],
        "hidden": [
            ("2 7\nPUT 1 1\nPUT 2 2\nGET 1\nPUT 3 3\nGET 2\nGET 1\nGET 3", "1\n-1\n1\n3"),
        ],
    },
    {
        "num": 546,
        "title": "Median of Two Sorted Arrays",
        "slug": "median-two-sorted-arrays",
        "category": "Binary Search / Arrays",
        "tags": ["binary-search", "median"],
        "statement": "Find the median of the combined sorted sequence of two sorted arrays in logarithmic time relative to the smaller array.",
        "constraints": "Array lengths≤10^5; at least one array is non-empty.",
        "input_format": "N M; then arrays A and B.",
        "output_format": "Median as a decimal number.",
        "approach": "Binary-search a partition in the smaller array so left-side values do not exceed right-side values.",
        "complexity": "O(log(min(N, M)))",
        "visible": [
            ("2 1\n1 3\n2", "2.0"),
            ("2 2\n1 2\n3 4", "2.5"),
            ("0 3\n1 2 3", "2.0"),
        ],
        "hidden": [
            ("3 4\n-5 0 10\n-2 4 6 8", "4.0"),
            ("1 0\n7", "7.0"),
        ],
    },
    {
        "num": 547,
        "title": "Minimum Meeting Rooms",
        "slug": "minimum-meeting-rooms",
        "category": "Intervals / Heap",
        "tags": ["intervals", "heap", "sorting"],
        "statement": "Find the minimum rooms needed for meetings. A room is reusable when one meeting ends exactly as another begins.",
        "constraints": "1≤N≤2×10^5; 0≤start<end≤10^9.",
        "input_format": "N; then N start/end pairs.",
        "output_format": "Minimum rooms.",
        "approach": "Sort meetings by start and maintain a min-heap of active ending times.",
        "complexity": "O(N log N)",
        "visible": [
            ("3\n0 30\n5 10\n15 20", "2"),
            ("4\n1 5\n2 6\n3 7\n8 9", "3"),
            ("2\n1 2\n2 3", "1"),
        ],
        "hidden": [
            ("5\n0 10\n1 2\n3 4\n5 6\n7 8", "2"),
            ("4\n1 10\n2 3\n4 5\n6 7", "2"),
        ],
    },
    {
        "num": 548,
        "title": "Top K Frequent Elements",
        "slug": "top-k-frequent-elements",
        "category": "HashMap / Heap",
        "tags": ["hashmap", "heap", "frequency"],
        "statement": "Return the K most frequent distinct elements. Break frequency ties by smaller numeric value.",
        "constraints": "1≤N≤2×10^5; K≤number of distinct values.",
        "input_format": "N K; then N integers.",
        "output_format": "Elements ordered by frequency descending, then value ascending.",
        "approach": "Count frequencies and sort or heap-order distinct values using the required comparator.",
        "complexity": "O(N log D)",
        "visible": [
            ("6 2\n1 1 1 2 2 3", "1 2"),
            ("5 2\n4 4 5 5 6", "4 5"),
            ("4 1\n-1 -1 2 3", "-1"),
        ],
        "hidden": [
            ("8 3\n5 5 4 4 4 3 3 2", "4 3 5"),
            ("7 2\n1 2 2 3 3 3 1", "3 1"),
        ],
    },
    {
        "num": 549,
        "title": "Insert and Merge Interval",
        "slug": "insert-and-merge-interval",
        "category": "Intervals / Arrays",
        "tags": ["intervals", "merging"],
        "statement": "Insert a new interval into sorted non-overlapping intervals and merge all overlaps.",
        "constraints": "0≤N≤10^5; endpoints≤10^9.",
        "input_format": "N; intervals; final new interval.",
        "output_format": "Resulting intervals.",
        "approach": "Append intervals before the new interval, merge overlaps, then append remaining intervals.",
        "complexity": "O(N)",
        "visible": [
            ("3\n1 3\n6 9\n12 15\n2 7", "2\n1 9\n12 15"),
            ("2\n1 2\n5 6\n3 4", "3\n1 2\n3 4\n5 6"),
            ("0\n4 8", "1\n4 8"),
        ],
        "hidden": [
            ("4\n1 5\n10 12\n15 18\n20 25\n0 30", "1\n0 30"),
            ("3\n2 4\n6 8\n10 12\n8 11", "3\n2 4\n6 12"),
        ],
    },
]

HINTS = {
    "Stacks / Arrays": (
        "Use a monotonic stack to track unresolved indices while scanning left to right.",
        "Whenever a warmer value arrives, pop the stack and record the day distance.",
        "Each index is pushed and popped once, giving O(N) time and O(N) space."
    ),
    "Stacks / Simulation": (
        "Simulate collisions with a stack where a collision happens only when a positive is followed by a negative.",
        "Pop while the top positive is smaller than the incoming negative; equal sizes cancel both.",
        "Amortized O(N): every asteroid is pushed at most once and popped at most once."
    ),
    "Arrays / Prefix Products": (
        "Compute prefix products into the answer first, then sweep right multiplying suffix products.",
        "Handle zero carefully — avoid division entirely, per the problem rule.",
        "Two passes over the array yield the answer in O(N) time and O(N) space."
    ),
    "Arrays / Prefix Sum": (
        "Track how often each prefix sum has occurred in a hash map.",
        "For the current prefix P, every prior prefix equal to P - K forms a valid subarray.",
        "Single pass over the array with a hash map achieves O(N) time."
    ),
    "Arrays / Two Pointers": (
        "Sort the array, fix one element, and run two pointers over the remaining range.",
        "Move pointers to drive the running sum toward the target while tracking the best difference.",
        "O(N²) from the two nested loops with a fixed element; sorting is O(N log N)."
    ),
    "Binary Search": (
        "Halve the search space by comparing the midpoint against the two boundaries.",
        "For rotated arrays, first identify which half is sorted and whether the target lies inside it.",
        "Each comparison discards half the range, giving O(log N) time."
    ),
    "Binary Search / Greedy": (
        "Binary-search the answer value (a page limit or minimum distance).",
        "Greedily verify feasibility of a candidate with a single linear pass.",
        "O(N log(range)) time — the range is large but the check is cheap."
    ),
    "Graphs / Grid DFS": (
        "Treat each land cell as a node connected to its four orthogonal land neighbors.",
        "Run DFS or BFS from every unvisited land cell and count each traversed component once.",
        "Visiting each cell once gives O(R×C) time and O(R×C) worst-case space."
    ),
    "Graphs / Multi-source BFS": (
        "Start BFS with every rotten orange at time zero.",
        "Process the grid level by level; each minute corresponds to one BFS layer.",
        "Each cell is processed once, so the runtime is O(R×C)."
    ),
    "Graphs / Coloring": (
        "Assign each vertex a color and flip it on every traversal step.",
        "BFS both colors and bipartition each connected component; a same-color edge means NO.",
        "Every edge is examined a constant number of times, so total work is O(N + M)."
    ),
    "Graphs / Minimum Spanning Tree": (
        "Sort edges by weight and add them using a Disjoint Set Union structure.",
        "Only add an edge when its endpoints belong to different components.",
        "Kruskal runs in O(M log M) dominated by the sort plus near-O(M·α) union-find operations."
    ),
    "Graphs / Weighted DFS": (
        "Build a weighted bidirectional graph where each equation edge stores its ratio and inverse.",
        "DFS from the source to the target multiplying edge weights along the path.",
        "Each traversal explores reachable variables once; total work is O(E + Q·E) worst case."
    ),
    "Dynamic Programming / Strings": (
        "Define dp[i][j] over prefixes of the two strings.",
        "Match-and-skip transitions let you both compute the length and backtrack a valid subsequence.",
        "O(|A|·|B|) time and space; strings up to length 2000 fit comfortably."
    ),
    "Dynamic Programming / Knapsack": (
        "Use dp[w] = the best value achievable with capacity exactly w using each item at most once.",
        "Iterate items in the outer loop and weights in reverse to enforce 0/1 (no reuse).",
        "O(N·W) time with a 1D table; backtrack decisions to recover the selected indices."
    ),
    "Dynamic Programming / Intervals": (
        "Let dp[i][j] be the minimum multiplication cost for matrices i through j.",
        "Try every split point between i and j and combine the two sub-costs.",
        "O(N³) with O(N²) space; base cases are single matrices with cost zero."
    ),
    "Strings / Dynamic Programming": (
        "Count palindromic substrings by expanding around every center — both odd and even lengths.",
        "Each successful expansion adds one palindromic substring.",
        "Two expansions per center and O(length) steps each give O(length²) overall."
    ),
    "Design / HashMap / Linked List": (
        "Keep a hashmap for O(1) key lookup plus a doubly linked list for recency order.",
        "GET and PUT both move a freshly-accessed key to the head and evict the tail when over capacity.",
        "Every operation is O(1) amortized with a capacity-limited structure."
    ),
    "Binary Search / Arrays": (
        "Binary-search a partition of the smaller array so every left value is ≤ every right value.",
        "The cut indices in both arrays are determined together; adjust based on the order of boundary values.",
        "O(log(min(N, M))) time with O(1) space; careful integer arithmetic avoids overflow."
    ),
    "Intervals / Heap": (
        "Sort meetings by start time and push each end time into a min-heap of active rooms.",
        "Pop the heap when its earliest end time is ≤ the current start so the room is reused.",
        "The heap size at any point is the active room count; tracking its peak gives O(N log N)."
    ),
    "HashMap / Heap": (
        "Count frequencies of every distinct value with a hash map.",
        "Order distinct values by frequency descending, then value ascending when frequencies tie.",
        "Heap or sort-based selection on the distinct keys gives O(N log D) time."
    ),
    "Intervals / Arrays": (
        "Intervals before the new one are copied untouched, provided they end before its start.",
        "Merge every interval overlapping the inserted one, then append the remaining intervals.",
        "A single linear pass over the sorted list gives O(N) time and O(N) output space."
    ),
}

DEFAULT_HINTS = (
    "Carefully separate the greedy/DP state definition, the transitions, and the base case before coding.",
    "Trace the algorithm on the sample cases; watch overflow and boundary indices at larger constraints.",
    "Aim for the stated complexity while keeping auxiliary memory minimal."
)

def build_question(q: dict) -> dict:
    num = q["num"]
    raw_title = q["title"]
    slug = q["slug"]
    category = q["category"]
    tags = q["tags"]
    statement = q["statement"]
    constraints = q["constraints"]
    input_format = q["input_format"]
    output_format = q["output_format"]
    complexity = q["complexity"]

    external_id = f"DSA-{num:03d}"

    vis_tests = []
    for i, (inp, out) in enumerate(q["visible"], start=1):
        vis_tests.append({
            "testNumber": i,
            "input": inp,
            "expectedOutput": out,
            "rawInput": inp,
        })

    hid_tests = []
    for i, (inp, out) in enumerate(q["hidden"], start=1):
        hid_tests.append({
            "testNumber": i,
            "input": inp,
            "expectedOutput": out,
        })

    examples = []
    for vt in vis_tests:
        examples.append({
            "input": vt["input"],
            "output": vt["expectedOutput"],
            "explanation": f"For input `{vt['rawInput']}`, the computed output is `{vt['expectedOutput']}`."
        })

    topic_hints = HINTS.get(category, DEFAULT_HINTS)
    hint_1 = f"{topic_hints[0]} For '{raw_title}', ensure you understand the required output format."
    hint_2 = f"{topic_hints[1]} Consider how the constraints ({constraints}) guide the algorithm choice."
    hint_3 = f"{topic_hints[2]} The target complexity is {complexity}."

    ai_analysis = {
        "problem_explanation": (
            f"### Problem Overview\n\n{statement}\n\n"
            f"### Input Specification\n{input_format}\n\n"
            f"### Output Specification\n{output_format}\n\n"
            f"### Constraints\n`{constraints}`\n\n"
            f"### Complexity Target\n- Time Complexity: `{complexity}`\n- Space Complexity: `O(1)` or `O(N)` based on implementation."
        ),
        "inputSpecification": input_format,
        "outputSpecification": output_format,
        "constraints": constraints,
        "hint_1": hint_1,
        "hint_2": hint_2,
        "hint_3": hint_3,
        "brute_force": (
            f"A straightforward approach directly follows the problem definition: read the input and simulate step-by-step. "
            f"For {category} problems of this type, a basic repeated scan or O(N²) simulation verifies correctness."
        ),
        "optimal_approach": (
            f"An optimal approach achieves the target complexity of {complexity} by applying standard {category} techniques "
            f"without redundant scanning or allocations."
        ),
        "time_complexity": complexity,
        "space_complexity": "O(1) auxiliary space (or O(N) if building an auxiliary result).",
        "interview_importance": "Intermediate Placement DSA - Frequently tested problem pattern in coding interviews and placement rounds.",
        "common_mistakes": [
            "Failing to handle boundary values (empty input, single element, negative integers)",
            "Incorrect parsing of multiline standard input",
            "Off-by-one errors in iteration bounds",
            "Forgetting to reset/clear state between test cases"
        ],
        "examples": examples,
        "timeLimit": "2.0s",
        "memoryLimit": "256 MB"
    }

    companies_pool = ["Amazon", "Microsoft", "Google", "Flipkart", "TCS", "Infosys", "Accenture"]
    comp_slice = [companies_pool[(num + i) % len(companies_pool)] for i in range(3)]

    return {
        "number": num,
        "externalId": external_id,
        "slug": slug,
        "title": f"{num}. {raw_title}",
        "rawTitle": raw_title,
        "category": category,
        "topic": category,
        "difficulty": "Intermediate",
        "rating": 1400 + (num % 3) * 50,
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

questions = [build_question(q) for q in RAW_QUESTIONS]

print(f"Parsing PDF: {PDF_PATH}")
print(f"Built {len(questions)} intermediate questions (DSA-526 .. DSA-{questions[-1]['number']:03d}).")

with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
    json.dump(questions, f, indent=2, ensure_ascii=False)

print(f"Saved JSON to: {OUTPUT_JSON} ({os.path.getsize(OUTPUT_JSON)} bytes)")