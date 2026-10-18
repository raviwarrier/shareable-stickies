
param (
    [string]$Title = "Cline Notification",
    [string]$Message = "Cline requires your attention.",
    [int]$Priority = 5
)

$GotifyUrl = "https://gotify2.raviwarrier.net"
$Token     = "gtfya.fH2GJmgDzZ1YLbbe4CA3Ubhn6iM_JAjGbjUHqFQRxjo"

$Uri = "$GotifyUrl/message?token=$Token"

# Convert the request payload to JSON for compatibility with Windows PowerShell 5.1
$Body = @{
    title    = $Title
    message  = $Message
    priority = $Priority
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $Uri -Method Post -Body $Body -ContentType "application/json"
    Write-Host "Gotify notification sent successfully." -ForegroundColor Green
} catch {
    Write-Warning "Failed to send Gotify notification: $_"
}
