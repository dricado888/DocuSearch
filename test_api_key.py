"""
Test script to validate Groq API key
Run this to debug API key issues
"""

import sys

# Test 1: Check API key format
print("=" * 60)
print("🔍 Groq API Key Validator")
print("=" * 60)

api_key = input("\nEnter your Groq API key: ").strip()

print("\n" + "=" * 60)
print("📋 VALIDATION CHECKS")
print("=" * 60)

# Check 1: Length
print(f"\n1. Length check:")
print(f"   - Your key length: {len(api_key)} characters")
print(f"   - Required: 20-500 characters")
print(f"   - Result: {'✅ PASS' if 20 <= len(api_key) <= 500 else '❌ FAIL'}")

# Check 2: Prefix
print(f"\n2. Prefix check:")
print(f"   - Starts with 'gsk_': {api_key.startswith('gsk_')}")
print(f"   - First 8 chars: {api_key[:8]}")
print(f"   - Result: {'✅ PASS' if api_key.startswith('gsk_') else '❌ FAIL - Groq keys must start with gsk_'}")

# Check 3: Whitespace
has_leading = api_key != api_key.lstrip()
has_trailing = api_key != api_key.rstrip()
print(f"\n3. Whitespace check:")
print(f"   - Leading spaces: {has_leading}")
print(f"   - Trailing spaces: {has_trailing}")
print(f"   - Result: {'❌ FAIL - Remove extra spaces' if (has_leading or has_trailing) else '✅ PASS'}")

# Check 4: Special characters
has_control_chars = any(ord(c) < 32 or ord(c) == 127 for c in api_key)
print(f"\n4. Control characters check:")
print(f"   - Has control chars: {has_control_chars}")
print(f"   - Result: {'❌ FAIL - Contains invalid characters' if has_control_chars else '✅ PASS'}")

# Test 2: Try actual API call
print("\n" + "=" * 60)
print("📡 TESTING ACTUAL API CONNECTION")
print("=" * 60)

try:
    from langchain_groq import ChatGroq

    print("\n⏳ Making test call to Groq API...")
    llm = ChatGroq(
        groq_api_key=api_key,
        model_name="mixtral-8x7b-32768",
        temperature=0
    )

    result = llm.invoke("Say 'API key works!'")
    print(f"\n✅ SUCCESS! API key is valid!")
    print(f"   Response: {result.content}")

except ImportError:
    print("\n⚠️  langchain-groq not installed")
    print("   Run: pip install langchain-groq")

except Exception as e:
    error_msg = str(e)
    print(f"\n❌ FAILED: {error_msg}")

    if "401" in error_msg or "invalid" in error_msg.lower():
        print("\n💡 This means:")
        print("   - The API key format is correct")
        print("   - But Groq rejected it (invalid/expired/wrong key)")
        print("\n🔧 What to do:")
        print("   1. Go to https://console.groq.com/keys")
        print("   2. Check if this key exists and is active")
        print("   3. If needed, create a new API key")
        print("   4. Copy the ENTIRE key (including 'gsk_' prefix)")
    else:
        print(f"\n💡 Unexpected error: {error_msg}")

print("\n" + "=" * 60)
