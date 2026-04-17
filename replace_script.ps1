$paths = "c:\Users\Aatmman C Patil\Desktop\smart_study_planner\StudyOS_PRD_and_SD_Character.md", "c:\Users\Aatmman C Patil\Desktop\smart_study_planner\task.md"

foreach ($p in $paths) {
    if (Test-Path $p) {
        $text = [IO.File]::ReadAllText($p)
        $text = $text -replace '(?i)\bclaude\b', 'qrok'
        $text = $text -replace '(?i)\banthropic\b', 'Groq'
        $text = $text -replace '(?i)\blocalStorage\b', 'Firebase'
        $text = $text -replace '(?i)local storage', 'Firebase'
        $text = $text -replace '(?i)\bIndexedDB\b', 'Firebase'
        $text = $text -replace '(?i)api\.anthropic\.com/v1/messages', 'api.groq.com/openai/v1/chat/completions'
        
        $header = "> **MCP Server connected**: https://gitmcp.io/aatmman/smart_study_planner`n`n"
        $text = $header + $text
        
        [IO.File]::WriteAllText($p, $text)
        Write-Host "Updated" $p
    }
}
Write-Host "All replacements done."
