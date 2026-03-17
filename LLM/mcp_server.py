"""A MCP server for AI agents"""

from fastmcp import FastMCP
import httpx

mcp = FastMCP("mcp")


@mcp.tool
def get(url: str) -> dict:
    """request data from url"""
    response = httpx.get(url)
    return response.json()


@mcp.tool
def post(url: str, data: dict) -> dict:
    """post data to url"""
    response = httpx.post(url, json=data)
    return response.json()


if __name__ == "__main__":
    mcp.run()
