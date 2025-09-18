import os
from langchain_groq import ChatGroq
from langgraph.prebuilt import create_react_agent
from langchain_core.tools import tool
from tools.file_operations import read_file, write_file, list_files, get_current_directory

# Initialize the Groq LLM
llm = ChatGroq(model="llama-3.1-70b-versatile")

# ---------------------------
# Wrap tools safely with @tool
# ---------------------------

@tool
def safe_write_file(path: str, content: str) -> str:
    """Write content to a file at the given path."""
    return write_file.run(path, content)

@tool
def safe_read_file(path: str) -> str:
    """Read the content of a file."""
    return read_file.run(path)

@tool
def safe_list_files() -> str:
    """List files in the current directory."""
    return list_files.run()

@tool
def safe_get_current_directory() -> str:
    """Get the current working directory."""
    return get_current_directory.run()

# ---------------------------
# Define Agents
# ---------------------------

def coder_agent():
    """Agent for handling coding-related tasks like file editing."""
    coder_tools = [safe_read_file, safe_write_file, safe_list_files, safe_get_current_directory]

    system_prompt = (
        "You are an AI coding assistant. "
        "You can read, write, and list files to help the user build applications. "
        "Always use the provided tools and return valid structured results."
    )

    react_agent = create_react_agent(llm, coder_tools)

    return react_agent

def project_manager_agent():
    """Agent for planning and high-level coordination."""
    system_prompt = (
        "You are a project manager AI. "
        "Break down tasks, delegate coding work to the coder agent when needed, "
        "and ensure the project progresses logically."
    )

    pm_tools = []  # Could add planning-specific tools here
    react_agent = create_react_agent(llm, pm_tools)

    return react_agent

# ---------------------------
# Graph Definition
# ---------------------------

from langgraph.graph import StateGraph, MessagesState, END

# Build the state graph
workflow = StateGraph(MessagesState)

# Add nodes
workflow.add_node("coder", coder_agent())
workflow.add_node("project_manager", project_manager_agent())

# Define flow
workflow.add_edge("project_manager", "coder")
workflow.add_edge("coder", END)

# Set entrypoint
workflow.set_entry_point("project_manager")

# Compile agent
agent = workflow.compile()
