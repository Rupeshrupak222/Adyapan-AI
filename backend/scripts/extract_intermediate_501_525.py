import json
import os

PDF_PATH = r"f:\New folder\Adyapan-AI\docs\intermediate_dsa_questions_501_525.pdf"
OUTPUT_JSON = r"f:\New folder\Adyapan-AI\docs\intermediate_dsa_questions.json"

# Raw per-question data transcribed from the PDF (metadata, statement, I/O format,
# approach, visible tests, hidden tests). Each visible test stores 3 visible cases,
# each hidden test stores 2 hidden cases (input/expectedOutput pairs as printed).
RAW_QUESTIONS = [
    {
        "num": 501,
        "title": "Longest Subarray With At Most K Distinct Values",
        "slug": "longest-subarray-at-most-k-distinct-values",
        "category": "Arrays / Sliding Window",
        "tags": ["array", "sliding-window", "hashmap", "two-pointers"],
        "statement": "Given an integer array and an integer K, find the length of the longest contiguous subarray containing at most K distinct values.",
        "constraints": "1 ≤ N ≤ 2×10^5; 1 ≤ K ≤ N; −10^9 ≤ A[i] ≤ 10^9.",
        "input_format": "First line: N K. Second line: N integers.",
        "output_format": "Print the maximum valid subarray length.",
        "approach": "Maintain a frequency map for a moving window. Expand the right boundary and move the left boundary while the number of distinct values exceeds K.",
        "complexity": "O(N)",
        "visible": [
            ("7 2\n1 2 1 2 3 2 2", "5"),
            ("5 1\n4 4 4 2 4", "3"),
            ("6 3\n1 2 3 4 5 6", "3"),
        ],
        "hidden": [
            ("8 2\n1 2 1 3 4 3 3 2", "4"),
            ("10 3\n5 5 6 7 5 6 7 8 8 8", "7"),
        ],
    },
    {
        "num": 502,
        "title": "Minimum Platforms Required for Train Schedule",
        "slug": "minimum-platforms-train-schedule",
        "category": "Arrays / Sorting / Greedy",
        "tags": ["sorting", "greedy", "intervals", "two-pointers"],
        "statement": "Given arrival and departure times of trains at a station, determine the minimum number of platforms required so that no train waits due to platform unavailability. A train arriving at the exact departure time of another train requires a separate platform.",
        "constraints": "1 ≤ N ≤ 10^5; times are integers in HHMM format; every departure is after its corresponding arrival.",
        "input_format": "First line: N. Second line: N arrival times. Third line: N departure times.",
        "output_format": "Print the minimum required platforms.",
        "approach": "Sort arrivals and departures separately. Sweep through both arrays, increasing the active count for an arrival before or at the next departure, otherwise releasing a platform.",
        "complexity": "O(N log N)",
        "visible": [
            ("6\n900 940 950 1100 1500 1800\n910 1200 1120 1130 1900 2000", "3"),
            ("3\n100 200 300\n150 250 350", "1"),
            ("4\n900 900 900 900\n1000 1000 1000 1000", "4"),
        ],
        "hidden": [
            ("5\n900 901 902 903 904\n905 906 907 908 909", "5"),
            ("5\n1000 1015 1030 1045 1100\n1010 1020 1040 1050 1110", "2"),
        ],
    },
    {
        "num": 503,
        "title": "Count Subarrays With Sum Divisible by K",
        "slug": "count-subarrays-sum-divisible-by-k",
        "category": "Arrays / Prefix Sum",
        "tags": ["prefix-sum", "hashmap", "modular-arithmetic"],
        "statement": "Count the number of contiguous subarrays whose sum is divisible by K. The array may contain negative values.",
        "constraints": "1 ≤ N ≤ 2×10^5; −10^4 ≤ A[i] ≤ 10^4; 1 ≤ K ≤ 10^5.",
        "input_format": "First line: N K. Second line: N integers.",
        "output_format": "Print the number of qualifying subarrays.",
        "approach": "Two prefix sums with the same normalized remainder modulo K define a subarray whose sum is divisible by K. Store frequencies of remainders.",
        "complexity": "O(N)",
        "visible": [
            ("6 5\n4 5 0 -2 -3 1", "7"),
            ("3 3\n1 2 3", "3"),
            ("5 2\n1 1 1 1 1", "6"),
        ],
        "hidden": [
            ("4 7\n7 -7 14 -14", "10"),
            ("6 4\n-1 2 3 -4 5 -5", "6"),
        ],
    },
    {
        "num": 504,
        "title": "Merge Overlapping Intervals With Minimum Output",
        "slug": "merge-overlapping-intervals",
        "category": "Intervals / Sorting",
        "tags": ["intervals", "sorting", "merging"],
        "statement": "Given N closed intervals, merge every pair of overlapping or touching intervals and output the resulting disjoint intervals in ascending order.",
        "constraints": "1 ≤ N ≤ 10^5; 0 ≤ start ≤ end ≤ 10^9.",
        "input_format": "First line: N. Next N lines: start end.",
        "output_format": "First print the number of merged intervals, followed by each merged interval on a separate line.",
        "approach": "Sort intervals by starting point. Extend the current interval whenever the next interval begins no later than current_end + 1; otherwise finalize the current interval.",
        "complexity": "O(N log N)",
        "visible": [
            ("4\n1 3\n2 6\n8 10\n9 12", "2\n1 6\n8 12"),
            ("3\n1 2\n3 4\n5 6", "1\n1 6"),
            ("3\n5 7\n1 2\n10 12", "3\n1 2\n5 7\n10 12"),
        ],
        "hidden": [
            ("5\n1 10\n2 3\n4 8\n11 12\n12 15", "2\n1 10\n11 15"),
            ("4\n0 0\n0 2\n3 3\n5 9", "2\n0 3\n5 9"),
        ],
    },
    {
        "num": 505,
        "title": "Kth Smallest Element in a Sorted Matrix",
        "slug": "kth-smallest-sorted-matrix",
        "category": "Binary Search / Matrix",
        "tags": ["binary-search", "matrix", "counting"],
        "statement": "You are given an N×N matrix where every row and every column is sorted in nondecreasing order. Find the Kth smallest element.",
        "constraints": "1 ≤ N ≤ 500; 1 ≤ K ≤ N²; matrix values lie between −10^9 and 10^9.",
        "input_format": "First line: N K. Next N lines contain N integers each.",
        "output_format": "Print the Kth smallest element.",
        "approach": "Binary-search the answer value. For each candidate, count how many matrix elements are less than or equal to it using a staircase traversal.",
        "complexity": "O(N log(max−min))",
        "visible": [
            ("3 8\n1 5 9\n10 11 13\n12 13 15", "13"),
            ("2 2\n1 2\n3 4", "2"),
            ("3 1\n-5 -4 -1\n0 2 3\n4 8 9", "-5"),
        ],
        "hidden": [
            ("4 10\n1 2 4 8\n3 5 7 9\n6 10 12 14\n11 13 15 20", "10"),
            ("2 4\n-3 -1\n0 6", "6"),
        ],
    },
    {
        "num": 506,
        "title": "Shortest Path in a Binary Matrix",
        "slug": "shortest-path-binary-matrix",
        "category": "Graphs / BFS",
        "tags": ["graph", "bfs", "grid", "shortest-path"],
        "statement": "Given a square binary grid, move in any of the eight directions from a cell containing 0 to another cell containing 0. Find the length of the shortest path from the top-left cell to the bottom-right cell, counting both endpoints.",
        "constraints": "1 ≤ N ≤ 1000; grid values are 0 or 1.",
        "input_format": "First line: N. Next N lines contain N binary values.",
        "output_format": "Print the shortest path length, or -1 if unreachable.",
        "approach": "Use BFS because every move has equal cost. Mark visited cells when enqueuing them to avoid repeated processing.",
        "complexity": "O(N²)",
        "visible": [
            ("3\n0 0 0\n1 1 0\n1 1 0", "4"),
            ("2\n0 1\n1 0", "-1"),
            ("3\n0 0 0\n0 1 0\n0 0 0", "3"),
        ],
        "hidden": [
            ("4\n0 1 0 0\n0 1 0 1\n0 0 0 1\n1 1 0 0", "5"),
            ("1\n0", "1"),
        ],
    },
    {
        "num": 507,
        "title": "Course Schedule Feasibility",
        "slug": "course-schedule-feasibility",
        "category": "Graphs / Topological Sort",
        "tags": ["graph", "dag", "topological-sort", "cycle-detection"],
        "statement": "There are N courses numbered from 0 to N−1 and prerequisite pairs [a,b], meaning course b must be completed before course a. Determine whether all courses can be completed.",
        "constraints": "1 ≤ N ≤ 10^5; 0 ≤ M ≤ 2×10^5; course IDs are valid.",
        "input_format": "First line: N M. Next M lines: a b.",
        "output_format": "Print YES if all courses can be completed; otherwise print NO.",
        "approach": "Build a directed graph and compute indegrees. Kahn’s algorithm can process every node exactly when the graph is acyclic.",
        "complexity": "O(N + M)",
        "visible": [
            ("2 1\n1 0", "YES"),
            ("2 2\n1 0\n0 1", "NO"),
            ("4 4\n1 0\n2 1\n3 2\n3 0", "YES"),
        ],
        "hidden": [
            ("5 5\n1 0\n2 0\n3 1\n3 2\n4 3", "YES"),
            ("3 3\n0 1\n1 2\n2 0", "NO"),
        ],
    },
    {
        "num": 508,
        "title": "Network Delay Time",
        "slug": "network-delay-time",
        "category": "Graphs / Dijkstra",
        "tags": ["weighted-graph", "dijkstra", "shortest-path"],
        "statement": "A directed weighted network contains N nodes. A signal starts at node K and travels along directed edges. Find the time needed for all nodes to receive the signal, or -1 if some node is unreachable.",
        "constraints": "1 ≤ N ≤ 10^5; 0 ≤ M ≤ 2×10^5; edge weights are positive and at most 10^6.",
        "input_format": "First line: N M K. Next M lines: u v w.",
        "output_format": "Print the maximum shortest-path distance from K to any node, or -1.",
        "approach": "Use Dijkstra’s algorithm with a min-priority queue. The answer is the largest finalized shortest distance.",
        "complexity": "O(M log N)",
        "visible": [
            ("4 4 2\n2 1 1\n2 3 1\n3 4 1\n1 4 5", "2"),
            ("3 1 1\n1 2 4", "-1"),
            ("5 6 1\n1 2 2\n1 3 5\n2 3 1\n3 4 2\n4 5 3\n2 5 10", "8"),
        ],
        "hidden": [
            ("4 5 1\n1 2 10\n1 3 3\n3 2 2\n2 4 1\n3 4 8", "6"),
            ("2 1 2\n1 2 7", "-1"),
        ],
    },
    {
        "num": 509,
        "title": "Longest Increasing Subsequence With Reconstruction",
        "slug": "longest-increasing-subsequence-reconstruction",
        "category": "Dynamic Programming / Binary Search",
        "tags": ["dp", "lis", "binary-search", "reconstruction"],
        "statement": "Find one strictly increasing subsequence of maximum length from an array. Output its length and the elements of one valid subsequence.",
        "constraints": "1 ≤ N ≤ 2×10^5; −10^9 ≤ A[i] ≤ 10^9.",
        "input_format": "First line: N. Second line: N integers.",
        "output_format": "First print the LIS length. On the next line print one LIS in order.",
        "approach": "Maintain the smallest possible tail value for each subsequence length and predecessor indices to reconstruct one optimal subsequence.",
        "complexity": "O(N log N)",
        "visible": [
            ("8\n10 9 2 5 3 7 101 18", "4\n2 3 7 101"),
            ("5\n5 4 3 2 1", "1\n5"),
            ("6\n1 2 2 3 4 1", "4\n1 2 3 4"),
        ],
        "hidden": [
            ("7\n7 1 5 2 6 3 9", "4\n1 2 6 9"),
            ("4\n-4 -2 -3 0", "3\n-4 -2 0"),
        ],
    },
    {
        "num": 510,
        "title": "Partition Array Into Equal-Sum Subsets",
        "slug": "partition-array-equal-sum-subsets",
        "category": "Dynamic Programming / Bitmask",
        "tags": ["dp", "subset-sum", "bitmask"],
        "statement": "Given an array of positive integers and an integer K, determine whether the array can be partitioned into exactly K non-empty subsets such that every subset has the same sum.",
        "constraints": "1 ≤ N ≤ 16; 1 ≤ K ≤ N; 1 ≤ A[i] ≤ 10^8.",
        "input_format": "First line: N K. Second line: N integers.",
        "output_format": "Print YES if such a partition exists; otherwise print NO.",
        "approach": "If total sum is not divisible by K, the answer is NO. Use subset-mask DP or backtracking with memoization to build groups of target sum.",
        "complexity": "O(2^N · N)",
        "visible": [
            ("7 4\n4 3 2 3 5 2 1", "YES"),
            ("5 3\n1 2 3 4 5", "NO"),
            ("6 2\n2 2 2 2 3 3", "YES"),
        ],
        "hidden": [
            ("8 4\n1 1 1 1 2 2 2 2", "YES"),
            ("6 3\n2 2 2 2 2 2", "YES"),
        ],
    },
    {
        "num": 511,
        "title": "Edit Distance Between Two Strings",
        "slug": "edit-distance-two-strings",
        "category": "Dynamic Programming / Strings",
        "tags": ["dp", "strings", "levenshtein-distance"],
        "statement": "Given two strings, calculate the minimum number of insertions, deletions, and substitutions required to transform the first string into the second.",
        "constraints": "0 ≤ |A|, |B| ≤ 2000; strings contain lowercase English letters.",
        "input_format": "Two lines containing strings A and B.",
        "output_format": "Print the minimum edit distance.",
        "approach": "Let dp[i][j] be the minimum operations to transform the first i characters into the first j characters of the second string.",
        "complexity": "O(|A|·|B|)",
        "visible": [
            ("horse\nros", "3"),
            ("intention\nexecution", "5"),
            ("abc\nabc", "0"),
        ],
        "hidden": [
            ("kitten\nsitting", "3"),
            ("abc\nxyz", "3"),
        ],
    },
    {
        "num": 512,
        "title": "Minimum Coins for Exact Amount",
        "slug": "minimum-coins-exact-amount",
        "category": "Dynamic Programming / Unbounded Knapsack",
        "tags": ["dp", "coin-change", "unbounded-knapsack"],
        "statement": "Given unlimited supplies of coins and a target amount, find the minimum number of coins needed to form the exact amount. If impossible, print -1.",
        "constraints": "1 ≤ N ≤ 100; 1 ≤ coin value ≤ 10^4; 0 ≤ target ≤ 10^5.",
        "input_format": "First line: N target. Second line: N distinct positive coin values.",
        "output_format": "Print the minimum number of coins, or -1.",
        "approach": "Use one-dimensional unbounded knapsack DP where dp[x] is the minimum coins needed to form amount x.",
        "complexity": "O(N·target)",
        "visible": [
            ("3 11\n1 2 5", "3"),
            ("2 3\n2 4", "-1"),
            ("4 0\n2 3 5 7", "0"),
        ],
        "hidden": [
            ("3 27\n2 5 10", "5"),
            ("5 63\n1 7 10 21 25", "3"),
        ],
    },
    {
        "num": 513,
        "title": "Maximum Product Subarray",
        "slug": "maximum-product-subarray",
        "category": "Arrays / Dynamic Programming",
        "tags": ["array", "dp", "greedy"],
        "statement": "Find the maximum product obtainable from a non-empty contiguous subarray. The array may contain negative values and zeros.",
        "constraints": "1 ≤ N ≤ 2×10^5; −10 ≤ A[i] ≤ 10.",
        "input_format": "First line: N. Second line: N integers.",
        "output_format": "Print the maximum subarray product.",
        "approach": "Track both maximum and minimum products ending at the current position because multiplying by a negative number swaps their roles.",
        "complexity": "O(N)",
        "visible": [
            ("4\n2 3 -2 4", "6"),
            ("3\n-2 0 -1", "0"),
            ("3\n-2 3 -4", "24"),
        ],
        "hidden": [
            ("5\n-1 -2 -3 0 -4", "6"),
            ("6\n-2 -3 0 -2 -40 4", "80"),
        ],
    },
    {
        "num": 514,
        "title": "Find All Anagram Starting Indices",
        "slug": "find-all-anagram-starting-indices",
        "category": "Strings / Sliding Window",
        "tags": ["strings", "hashmap", "sliding-window"],
        "statement": "Given strings S and P, find every starting index in S where an anagram of P occurs as a contiguous substring. Indices are zero-based.",
        "constraints": "1 ≤ |P| ≤ |S| ≤ 2×10^5; lowercase English letters only.",
        "input_format": "First line: S. Second line: P.",
        "output_format": "Print the number of indices followed by the indices in ascending order.",
        "approach": "Compare character frequencies in a fixed-size sliding window of length |P| against the frequency vector of P.",
        "complexity": "O(|S|)",
        "visible": [
            ("cbaebabacd\nabc", "2 0 6"),
            ("abab\nab", "3 0 1 2"),
            ("abcdef\ngh", "0"),
        ],
        "hidden": [
            ("baa\naa", "1 1"),
            ("abbcabc\nabc", "2 2 4"),
        ],
    },
    {
        "num": 515,
        "title": "Decode Nested Repetition String",
        "slug": "decode-nested-repetition-string",
        "category": "Stacks / Strings",
        "tags": ["stack", "parsing", "strings"],
        "statement": "Decode an encoded string where patterns follow the form k[encoded_text]. The encoded text may contain nested patterns. Return the fully decoded string.",
        "constraints": "Encoded length ≤ 5000; repetition counts are between 1 and 10^4; decoded output length ≤ 10^6.",
        "input_format": "One line containing the encoded string.",
        "output_format": "Print the decoded string.",
        "approach": "Use stacks for repetition counts and partial strings. When a closing bracket appears, pop the latest context and repeat the completed segment.",
        "complexity": "O(decoded length)",
        "visible": [
            ("3[a]2[bc]", "aaabcbc"),
            ("3[a2[c]]", "accaccacc"),
            ("2[ab3[c]]", "abcccabccc"),
        ],
        "hidden": [
            ("10[x]", "xxxxxxxxxx"),
            ("2[a2[b2[c]]]", "abcbcbcbcbcbcbcb"),
        ],
    },
    {
        "num": 516,
        "title": "Largest Rectangle in Histogram",
        "slug": "largest-rectangle-histogram",
        "category": "Stacks / Arrays",
        "tags": ["monotonic-stack", "histogram"],
        "statement": "Given bar heights in a histogram where each bar has width one, find the area of the largest rectangle formed by consecutive bars.",
        "constraints": "1 ≤ N ≤ 2×10^5; 0 ≤ height ≤ 10^9.",
        "input_format": "First line: N. Second line: N heights.",
        "output_format": "Print the maximum rectangle area.",
        "approach": "Use a monotonic increasing stack to determine the nearest smaller bar on both sides for each height.",
        "complexity": "O(N)",
        "visible": [
            ("6\n2 1 5 6 2 3", "10"),
            ("2\n2 2", "4"),
            ("5\n1 2 3 4 5", "9"),
        ],
        "hidden": [
            ("7\n6 2 5 4 5 1 6", "12"),
            ("4\n0 0 0 0", "0"),
        ],
    },
    {
        "num": 517,
        "title": "Serialize and Deserialize a Binary Tree",
        "slug": "serialize-deserialize-binary-tree",
        "category": "Trees / Traversal",
        "tags": ["binary-tree", "dfs", "serialization"],
        "statement": "Given a binary tree in level-order form, serialize it using preorder traversal with null markers, then deserialize the representation and print its inorder traversal. The goal is to preserve the exact tree structure.",
        "constraints": "1 ≤ number of nodes ≤ 10^4; node values range from −10^9 to 10^9.",
        "input_format": "First line: N. Second line: level-order tokens where # represents null.",
        "output_format": "Print the serialized preorder representation and the inorder traversal after deserialization.",
        "approach": "A preorder traversal with explicit null markers uniquely identifies a binary tree. Deserialize by consuming tokens recursively.",
        "complexity": "O(N)",
        "visible": [
            ("7\n1 2 3 # # 4 5", "1 2 # # 3 4 # # 5 # #\n2 1 4 3 5"),
            ("1\n7", "7 # #\n7"),
            ("3\n1 # 2", "1 # 2 # #\n1 2"),
        ],
        "hidden": [
            ("7\n10 5 15 2 7 12 20", "10 5 2 # # 7 # # 15 12 # # 20 # #\n2 5 7 10 12 15 20"),
            ("1\n-4", "-4 # #\n-4"),
        ],
    },
    {
        "num": 518,
        "title": "Lowest Common Ancestor in a Binary Tree",
        "slug": "lowest-common-ancestor-binary-tree",
        "category": "Trees / Recursion",
        "tags": ["binary-tree", "lca", "recursion"],
        "statement": "Given a binary tree and two node values guaranteed to exist in the tree, find their lowest common ancestor. Values are unique.",
        "constraints": "1 ≤ N ≤ 10^5; node values are unique integers.",
        "input_format": "First line: N. Second line: level-order representation with # for null. Third line: two target values.",
        "output_format": "Print the value of the lowest common ancestor.",
        "approach": "Recursively search both subtrees. If one target is found in each subtree, the current node is the LCA; if the current node matches either target, return it upward.",
        "complexity": "O(N)",
        "visible": [
            ("7\n3 5 1 6 2 0 8\n5 1", "3"),
            ("5\n3 5 1 6 2\n6 2", "5"),
            ("3\n1 2 3\n2 3", "1"),
        ],
        "hidden": [
            ("7\n10 5 15 3 7 12 20\n3 7", "5"),
            ("7\n10 5 15 3 7 12 20\n12 20", "15"),
        ],
    },
    {
        "num": 519,
        "title": "Detect Cycle in an Undirected Graph",
        "slug": "detect-cycle-undirected-graph",
        "category": "Graphs / DFS-BFS",
        "tags": ["graph", "cycle-detection", "dfs", "union-find"],
        "statement": "Given an undirected graph with N vertices and M edges, determine whether the graph contains at least one cycle.",
        "constraints": "1 ≤ N ≤ 10^5; 0 ≤ M ≤ 2×10^5; self-loops and parallel edges may appear.",
        "input_format": "First line: N M. Next M lines: u v using 1-based vertices.",
        "output_format": "Print YES if a cycle exists; otherwise print NO.",
        "approach": "Use DFS with parent tracking or Disjoint Set Union. An edge connecting two already-connected vertices indicates a cycle.",
        "complexity": "O(N + M)",
        "visible": [
            ("3 3\n1 2\n2 3\n3 1", "YES"),
            ("4 3\n1 2\n2 3\n3 4", "NO"),
            ("2 2\n1 2\n1 2", "YES"),
        ],
        "hidden": [
            ("5 4\n1 2\n2 3\n4 5\n1 3", "YES"),
            ("1 1\n1 1", "YES"),
        ],
    },
    {
        "num": 520,
        "title": "Word Ladder Shortest Transformation",
        "slug": "word-ladder-shortest-transformation",
        "category": "Graphs / BFS / Strings",
        "tags": ["bfs", "graph", "strings", "shortest-path"],
        "statement": "Transform a begin word into an end word by changing exactly one character at a time. Every intermediate word must belong to a supplied dictionary. Return the number of words in the shortest valid transformation sequence, including both endpoints.",
        "constraints": "1 ≤ dictionary size ≤ 5000; all words have equal length ≤ 10; lowercase letters only.",
        "input_format": "First line: beginWord endWord. Second line: M. Next M lines: dictionary words.",
        "output_format": "Print the shortest sequence length, or 0 if impossible.",
        "approach": "Treat words as graph nodes and connect words differing by one character. BFS finds the shortest transformation.",
        "complexity": "O(M·L²)",
        "visible": [
            ("hit cog\n6\nhot dot dog lot log cog", "5"),
            ("hit cog\n5\nhot dot dog lot log", "0"),
            ("a c\n3\na b c", "2"),
        ],
        "hidden": [
            ("talk tail\n5\ntalk tall tail balk bail", "3"),
            ("lost cost\n4\nmost cost lost host", "2"),
        ],
    },
    {
        "num": 521,
        "title": "House Robber on a Circular Street",
        "slug": "house-robber-circular-street",
        "category": "Dynamic Programming",
        "tags": ["dp", "circular-array", "optimization"],
        "statement": "Houses are arranged in a circle. Adjacent houses cannot both be robbed because of an alarm. Find the maximum amount of money that can be robbed without robbing neighboring houses.",
        "constraints": "1 ≤ N ≤ 2×10^5; 0 ≤ money[i] ≤ 10^9.",
        "input_format": "First line: N. Second line: N nonnegative integers.",
        "output_format": "Print the maximum obtainable amount.",
        "approach": "The first and last houses cannot both be selected. Solve two linear cases: exclude the first house or exclude the last house.",
        "complexity": "O(N)",
        "visible": [
            ("4\n2 3 2 3", "6"),
            ("3\n1 2 3", "3"),
            ("1\n7", "7"),
        ],
        "hidden": [
            ("5\n5 1 1 5 2", "10"),
            ("6\n10 2 2 10 2 2", "20"),
        ],
    },
    {
        "num": 522,
        "title": "Target Sum Ways",
        "slug": "target-sum-ways",
        "category": "Dynamic Programming / Subset Sum",
        "tags": ["dp", "subset-sum", "counting"],
        "statement": "Assign either + or − before every number in an array so that the resulting expression equals target. Count the number of valid assignments.",
        "constraints": "1 ≤ N ≤ 20; 0 ≤ A[i] ≤ 1000; −10^4 ≤ target ≤ 10^4.",
        "input_format": "First line: N target. Second line: N integers.",
        "output_format": "Print the number of valid sign assignments.",
        "approach": "Use memoized recursion over index and current sum, or transform the problem into counting subsets when applicable.",
        "complexity": "O(N·sum)",
        "visible": [
            ("5 3\n1 1 1 1 1", "5"),
            ("3 0\n0 0 0", "8"),
            ("2 1\n1 2", "1"),
        ],
        "hidden": [
            ("4 2\n1 2 3 4", "2"),
            ("6 0\n1 1 1 1 1 1", "20"),
        ],
    },
    {
        "num": 523,
        "title": "Minimum Window Containing All Characters",
        "slug": "minimum-window-containing-all-characters",
        "category": "Strings / Sliding Window",
        "tags": ["strings", "sliding-window", "hashmap"],
        "statement": "Given strings S and T, find the shortest substring of S that contains every character of T with at least the required frequency. If no such substring exists, print -1.",
        "constraints": "1 ≤ |T| ≤ |S| ≤ 2×10^5; strings contain upper- and lowercase English letters.",
        "input_format": "First line: S. Second line: T.",
        "output_format": "Print the shortest valid substring, or -1.",
        "approach": "Expand a right pointer until all required characters are satisfied, then shrink from the left while maintaining validity.",
        "complexity": "O(|S|)",
        "visible": [
            ("ADOBECODEBANC\nABC", "BANC"),
            ("a\na", "a"),
            ("a\nb", "-1"),
        ],
        "hidden": [
            ("aaabdabcefaecbef\nabc", "abc"),
            ("this is a test string\ntist", "t stri"),
        ],
    },
    {
        "num": 524,
        "title": "Rotate a Linked List by K Positions",
        "slug": "rotate-linked-list-k-positions",
        "category": "Linked Lists",
        "tags": ["linked-list", "pointers", "modular-arithmetic"],
        "statement": "Given a singly linked list, rotate it to the right by K positions and print the resulting list.",
        "constraints": "0 ≤ N ≤ 10^5; 0 ≤ K ≤ 10^18; node values range from −10^9 to 10^9.",
        "input_format": "First line: N K. Second line: N node values.",
        "output_format": "Print the rotated list.",
        "approach": "Connect the tail to the head to form a cycle, then break the cycle immediately before the new head after reducing K modulo N.",
        "complexity": "O(N)",
        "visible": [
            ("5 2\n1 2 3 4 5", "4 5 1 2 3"),
            ("3 0\n1 2 3", "1 2 3"),
            ("1 99\n7", "7"),
        ],
        "hidden": [
            ("6 8\n1 2 3 4 5 6", "5 6 1 2 3 4"),
            ("4 6\n-1 -2 -3 -4", "-3 -4 -1 -2"),
        ],
    },
    {
        "num": 525,
        "title": "Find Duplicate Number Without Extra Space",
        "slug": "find-duplicate-number-without-extra-space",
        "category": "Arrays / Cycle Detection",
        "tags": ["array", "floyd-cycle-detection", "pointers"],
        "statement": "An array contains N+1 integers where each value lies between 1 and N. Exactly one value appears at least twice. Find the duplicated value without modifying the array and using O(1) extra space.",
        "constraints": "1 ≤ N ≤ 10^5; values are in [1,N].",
        "input_format": "First line: N. Second line: N+1 integers.",
        "output_format": "Print the duplicate value.",
        "approach": "Interpret the array as a functional graph and apply Floyd’s tortoise-and-hare cycle detection to find the cycle entrance.",
        "complexity": "O(N)",
        "visible": [
            ("4\n1 3 4 2 2", "2"),
            ("3\n1 3 3 2", "3"),
            ("5\n2 5 1 1 4 3", "1"),
        ],
        "hidden": [
            ("6\n6 4 3 2 5 1 6", "6"),
            ("2\n1 1 2", "1"),
        ],
    },
]

# Category-specific hint tuples (Intermediate level) keyed by the PDF category string.
HINTS = {
    "Arrays / Sliding Window": (
        "Maintain a frequency map inside a two-pointer window and expand/shrink the right/left ends in one pass.",
        "A window is valid when distinct-count ≤ K; shrink the left pointer while distinct-count exceeds K.",
        "Optimal solution runs in O(N) time with a hash map tracking per-value frequencies."
    ),
    "Arrays / Sorting / Greedy": (
        "Sort the two time sequences independently, then sweep with two pointers counting overlapping trains.",
        "A greedy sweep increments the active count for an arrival and decrements it once a departure is released.",
        "Track the peak of the active count; this peak equals the minimum required platforms in O(N log N)."
    ),
    "Arrays / Prefix Sum": (
        "Normalize prefix sums modulo K, remembering that negative remainders must be adjusted to [0, K-1].",
        "Two prefix sums with equal remainder define a subarray whose sum is divisible by K.",
        "Count matching remainder frequencies as you scan; the answer is the sum of C(freq, 2) in O(N)."
    ),
    "Intervals / Sorting": (
        "Sort intervals by start, then greedily extend the current merged interval when possible.",
        "Intervals that are touching (next start ≤ current_end + 1) belong to the same merged block.",
        "A single sort plus one linear merge pass yields O(N log N) overall."
    ),
    "Binary Search / Matrix": (
        "Binary search over the candidate value range instead of over indices.",
        "For each candidate, count matrix elements ≤ candidate using a staircase traversal from the top-right corner.",
        "The answer is the smallest value for which the count reaches K; total O(N log(max−min))."
    ),
    "Graphs / BFS": (
        "Represent the grid as an implicit graph where moves go to 0-cells in eight directions.",
        "BFS gives the shortest path in unweighted graphs; mark cells visited when enqueuing.",
        "Boundary checks + a queue make this run in O(N²) time and space."
    ),
    "Graphs / Topological Sort": (
        "Build an adjacency list and compute indegrees for every course.",
        "Run Kahn’s algorithm: repeatedly enqueue courses with indegree zero.",
        "All courses can be completed iff exactly N nodes are processed — a cycle means NO."
    ),
    "Graphs / Dijkstra": (
        "Model the network as a weighted directed graph and relax edges from source K.",
        "Use a min-priority queue so the first-popped distance is final.",
        "The answer is the largest finalized distance, or -1 if some node remains unreachable."
    ),
    "Dynamic Programming / Binary Search": (
        "Maintain tails[i] = the smallest possible tail of an increasing subsequence of length i.",
        "Use binary search to extend tails for each element and keep predecessor pointers for reconstruction.",
        "This yields O(N log N) time; rebuild the LIS by following predecessors in reverse."
    ),
    "Dynamic Programming / Bitmask": (
        "Every element belongs to exactly one subset, so a mask of chosen elements defines the state.",
        "First check the total sum is divisible by K, otherwise the answer is NO immediately.",
        "Memoized subset DP targets one group at a time; complexity O(2^N · N) with N ≤ 16."
    ),
    "Dynamic Programming / Strings": (
        "Define dp[i][j] as the edit distance between the first i chars of A and the first j chars of B.",
        "Transitions are based on insert, delete, or substitute (and a no-op when characters match).",
        "Classic O(|A|·|B|) DP; the two strings can be up to 2000 characters each."
    ),
    "Dynamic Programming / Unbounded Knapsack": (
        "Use a 1D dp[x] = minimum coins to make amount x with unlimited coin supplies.",
        "Iterate coins and update dp in forward order because coins can be reused.",
        "O(N·target) time; a dp[x] of infinity means the amount is impossible (-1)."
    ),
    "Arrays / Dynamic Programming": (
        "Track both maximum and minimum product ending at the current index.",
        "Multiplying by a negative flips which extreme becomes useful, so keep both.",
        "A single pass with max/min tracking and the zero-reset rule runs in O(N)."
    ),
    "Strings / Sliding Window": (
        "Compare character frequencies of a fixed-length window against the pattern’s frequency vector.",
        "Slide the window one character at a time and update the two affected counts.",
        "Amortized O(|S|) with an array of 26 counters and a matches counter."
    ),
    "Stacks / Strings": (
        "Push repetition counts and partial decoded strings onto two stacks.",
        "On a closing bracket, pop and repeat the completed inner segment count times.",
        "Each character is pushed/popped a constant number of times, so the runtime is linear in the decoded length."
    ),
    "Stacks / Arrays": (
        "Use a monotonic increasing stack to locate the nearest smaller bar on the left and right for each bar.",
        "For bar i, the rectangle width is right_smaller[i] − left_smaller[i] − 1.",
        "Every index enters and leaves the stack once, giving O(N) time."
    ),
    "Trees / Traversal": (
        "Serialize with preorder traversal writing null markers for missing children.",
        "Deserialize by consuming tokens recursively in the same preorder order.",
        "The serialized string plus an inorder pass is O(N); # tokens preserve the exact shape."
    ),
    "Trees / Recursion": (
        "Search the left and right subtrees recursively for the two target values.",
        "If one target is in each subtree, the current node is the LCA; a matching node returns itself upward.",
        "Each node is visited once, so the algorithm is O(N) worst case."
    ),
    "Graphs / DFS-BFS": (
        "An undirected graph has a cycle if an edge connects two vertices already connected by a path.",
        "Run DFS with a parent pointer: any back edge to a non-parent visited node proves a cycle.",
        "O(N + M) using an adjacency list; self-loops and parallel edges are counted as cycles."
    ),
    "Graphs / BFS / Strings": (
        "Treat each dictionary word as a node; connect words that differ in exactly one character.",
        "BFS from the begin word finds the shortest transformation sequence length.",
        "Building the graph is O(M·L²); BFS explores each word once."
    ),
    "Dynamic Programming": (
        "The first and last houses conflict in a circle, so solve the linear case twice — once excluding the first, once excluding the last.",
        "For a linear row, dp[i] = max(dp[i-1], dp[i-2] + money[i]).",
        "Each linear pass is O(N) with O(1) extra state."
    ),
    "Dynamic Programming / Subset Sum": (
        "Recurse over (index, current_sum) with memoization, each element taking + or −.",
        "Counting assignments requires a state keyed by the running sum or the subset-sum transform.",
        "O(N·sum) with an offset for negative sums; N ≤ 20 keeps the state small."
    ),
    "Linked Lists": (
        "Join the tail to the head, reduce K modulo N, then walk N − K steps and sever the link.",
        "Handle N = 0 and K = 0 edge cases before forming the cycle.",
        "A few pointer relinks give O(N) time and O(1) space."
    ),
    "Arrays / Cycle Detection": (
        "Indexes form a functional graph where each value points to the next index.",
        "Floyd's tortoise-and-hare reveals the cycle, and its entrance is the duplicate value.",
        "O(N) time with O(1) extra space, and the array is never mutated."
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
print(f"Built {len(questions)} intermediate questions (DSA-501 .. DSA-525).")

with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
    json.dump(questions, f, indent=2, ensure_ascii=False)

print(f"Saved JSON to: {OUTPUT_JSON} ({os.path.getsize(OUTPUT_JSON)} bytes)")