# PowerShell script to extract clean paragraph-formatted text from DOCX files
param(
    [string]$DocxPath,
    [string]$OutputPath
)

try {
    Add-Type -AssemblyName System.IO.Compression
    Add-Type -AssemblyName System.IO.Compression.FileSystem

    if (-not (Test-Path $DocxPath)) {
        Write-Error "Source DOCX file not found: $DocxPath"
        exit 1
    }

    Write-Host "Opening DOCX archive: $DocxPath"
    $zip = [System.IO.Compression.ZipFile]::OpenRead($DocxPath)
    $entry = $zip.Entries | Where-Object { $_.FullName -eq "word/document.xml" }

    if ($null -eq $entry) {
        Write-Error "Could not find word/document.xml inside the DOCX archive."
        $zip.Dispose()
        exit 1
    }

    $stream = $entry.Open()
    $reader = New-Object System.IO.StreamReader($stream)
    $xmlText = $reader.ReadToEnd()
    $reader.Close()
    $stream.Close()
    $zip.Dispose()

    Write-Host "Parsing XML structure..."
    [xml]$xml = $xmlText
    $namespaces = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
    $namespaces.AddNamespace("w", "http://schemas.openxmlformats.org/wordprocessingml/2006/main")

    $paragraphs = $xml.SelectNodes("//w:p", $namespaces)
    $out = New-Object System.Collections.Generic.List[string]

    foreach ($p in $paragraphs) {
        $textNodes = $p.SelectNodes(".//w:t", $namespaces)
        $pText = ""
        foreach ($t in $textNodes) {
            $pText += $t.InnerText
        }
        # Include empty lines to preserve spacing
        $out.Add($pText)
    }

    $out | Out-File $OutputPath -Encoding utf8
    Write-Host "Successfully extracted text to: $OutputPath"
}
catch {
    Write-Error "An error occurred: $_"
    exit 1
}
