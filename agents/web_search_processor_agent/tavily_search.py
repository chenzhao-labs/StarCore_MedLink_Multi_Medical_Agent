import requests
from langchain_community.tools.tavily_search import TavilySearchResults

class TavilySearchAgent:
    """
    Processes general documents for the RAG system with context-aware chunking.
    """
    def __init__(self, tavily_api_key: str = ""):
        self.tavily_api_key = tavily_api_key

    def search_tavily(self, query: str) -> str:
        """Perform a general web search using Tavily API."""
        import os
        api_key = self.tavily_api_key or os.getenv("TAVILY_API_KEY", "")
        tavily_search = TavilySearchResults(tavily_api_key=api_key, max_results=5)

        # url = "https://api.tavily.com/search"
        # params = {
        #     "api_key": tavily_api_key,
        #     "query": query,
        #     "num_results": 5
        # }
        
        try:
            # response = requests.get(url, params=params)
            # Strip any surrounding quotes from the query
            query = query.strip('"\'')
            # print("Printing query:", query)
            search_docs = tavily_search.invoke(query)
            # data = response.json()
            # if "results" in data:
            if len(search_docs):
                return "\n".join(["title: " + str(res["title"]) + " - " + 
                                  "url: " + str(res["url"]) + " - " + 
                                  "content: " + str(res["content"]) + " - " + 
                                  "score: " + str(res["score"]) for res in search_docs])
            return "No relevant results found."
        except Exception as e:
            return f"Error retrieving web search results: {e}"