/**
 * Python SDK for Prompt Debug
 * 
 * Usage:
 * 
 * from prompt_debug import PromptDebug
 * 
 * debug = PromptDebug("http://localhost:3001")
 * 
 * response = openai.chat.completions.create(...)
 * debug.capture(
 *     agent_name="MyAgent",
 *     step_name="Summarize",
 *     prompt="Summarize...",
 *     output=response.choices[0].message.content,
 *     prompt_tokens=response.usage.prompt_tokens,
 *     completion_tokens=response.usage.completion_tokens,
 * )
 */

import requests
from typing import Optional, Dict, Any, Literal
import time

class PromptDebug:
    def __init__(self, base_url: str = "http://localhost:3001"):
        self.base_url = base_url
    
    def capture(
        self,
        agent_name: str,
        step_name: str,
        prompt: str,
        output: Optional[str] = None,
        input: Optional[Dict[str, str]] = None,
        prompt_tokens: int = 0,
        completion_tokens: int = 0,
        latency_ms: int = 0,
        cost: float = 0.0,
        status: Literal["completed", "failed"] = "completed",
        error_message: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, str]:
        payload = {
            "agentName": agent_name,
            "stepName": step_name,
            "prompt": prompt,
            "output": output,
            "input": input,
            "promptTokens": prompt_tokens,
            "completionTokens": completion_tokens,
            "latencyMs": latency_ms,
            "cost": cost,
            "status": status,
            "errorMessage": error_message,
            "metadata": metadata,
        }
        res = requests.post(f"{self.base_url}/api/capture/step", json=payload)
        res.raise_for_status()
        return res.json()
    
    def with_capture(self, agent_name: str, step_name: str, prompt: str, fn, input: Optional[Dict[str, str]] = None):
        """Decorator/wrapper for auto-capturing"""
        start = time.time()
        try:
            result = fn()
            latency_ms = int((time.time() - start) * 1000)
            self.capture(
                agent_name=agent_name,
                step_name=step_name,
                prompt=prompt,
                output=result.get("content"),
                input=input,
                prompt_tokens=result.get("promptTokens", 0),
                completion_tokens=result.get("completionTokens", 0),
                latency_ms=latency_ms,
                status="completed",
            )
            return result
        except Exception as e:
            latency_ms = int((time.time() - start) * 1000)
            self.capture(
                agent_name=agent_name,
                step_name=step_name,
                prompt=prompt,
                input=input,
                latency_ms=latency_ms,
                status="failed",
                error_message=str(e),
            )
            raise
