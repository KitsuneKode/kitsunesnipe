Output test/vhs/golden/launch-story.gif

Set Width 1600
Set Height 900
Set FontSize 18
Set Theme "Catppuccin Macchiato"
Set Padding 24
Set Margin 24
Set MarginFill "#12121a"
Set BorderRadius 10
Set Framerate 30
Set PlaybackSpeed 0.75

Hide
Type "cd /home/kitsunekode/Projects/hacking/kitsunesnipe"
Enter
Type "clear"
Enter
Show

Sleep 800ms
Type "bun run dev -- -a"
Enter
Wait+Screen /Browse your favorite anime/
Sleep 900ms

Type "Demon Slayer"
Sleep 500ms
Enter
Sleep 2500ms

Type "/"
Sleep 300ms
Type "help"
Sleep 300ms
Enter
Wait+Screen /Global commands/
Sleep 1200ms
Escape
Sleep 500ms

Type "/"
Sleep 300ms
Type "settings"
Sleep 300ms
Enter
Sleep 1200ms
Escape
Sleep 500ms

Type "/"
Sleep 300ms
Type "diagnostics"
Sleep 300ms
Enter
Sleep 1400ms
Escape
Sleep 500ms

Ctrl+C
Wait
