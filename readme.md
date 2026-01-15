# 🌌 PyNexus (ou le nom choisi)

> **Local Python Dependency Visualizer & Manager**
> *Analyze. Visualize. Extract.*

PyNexus is a cyberpunk-themed React application designed to analyze local Python projects without uploading any data. It parses your source code to map dependencies as an interactive force-directed graph and generates accurate `requirements.txt` files directly into your project folder.

### ⚡ Key Features

* **Cyberpunk UI:** Immersive dark-mode interface with neon accents built with Tailwind CSS.
* **Local-First:** Uses the **File System Access API** to read and write directly to your disk. No server uploads.
* **Smart Parsing:** Detects imports in `.py` and `.pyw` files using AST-like regex patterns.
* **Dependency Constellation:** Visualizes file relationships using `react-force-graph`.
* **Intelligent Filters:** Automatically distinguishes between Python Standard Library (stdlib) and third-party packages.
* **Version Fetching:** Queries PyPI to suggest the latest stable versions for your `requirements.txt`.

### 🛠 Stack

* React + Vite
* Tailwind CSS
* Lucide React (Icons)
* React Force Graph