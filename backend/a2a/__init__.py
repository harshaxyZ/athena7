"""
A2A-style in-process agent layer.

Agents communicate by publishing A2A-shaped Messages/Artifacts over an
asyncio MessageBus — same mental model as the A2A protocol, but in-process
(no HTTP/serialization overhead).
"""
