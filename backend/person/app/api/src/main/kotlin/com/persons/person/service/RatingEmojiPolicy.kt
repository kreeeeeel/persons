package com.persons.person.service

import com.persons.person.exception.impl.InvalidInputException
import org.springframework.stereotype.Component

@Component
class RatingEmojiPolicy {
    val available: List<String> = listOf(
        "🤡", "💩", "🗿", "👹", "👺", "💀", "☠️", "👻", "👽", "👾", "🤖", "🦧",
        "🥴", "🤪", "😈", "👿", "🤢", "🤮", "🤧", "🧌", "🫥", "🤫", "🦆", "🪿",
        "⭐", "💜", "🔥", "❤️", "💛", "💚", "💙", "🩷", "🤍", "🖤", "💖", "💎",
        "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "🥰", "😍", "🤩",
        "😎", "🥳", "😇", "🙂", "🙃", "😉", "🤗", "🤔", "🫡", "🤝", "👍", "👎",
        "👏", "🙌", "💪", "✌️", "🤟", "🫶", "👌", "🤌", "😐", "😑", "😶", "🙄",
        "😏", "😴", "🥱", "😮", "😱", "🥹", "🥲", "😭", "😤", "😡", "🤯", "🫠",
        "👀", "🧠", "👑", "🏆", "🥇", "🎯", "🚀", "⚡", "✨", "🌟", "🌈", "☀️",
        "🌙", "🍀", "🌸", "🌻", "🐰", "🐱", "🐶", "🦊", "🐻", "🐼", "🦄", "🐸",
        "🐧", "🐥", "🦋", "🐝", "🍕", "🍔", "🍩", "🍪", "☕", "🎮", "🎨", "🎸",
    )

    fun validate(emoji: String): String {
        if (emoji !in available) throw InvalidInputException()
        return emoji
    }
}
