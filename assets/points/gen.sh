for ((i = 1; i <= 99; i++)); do
  echo '<svg width="80" height="50" xmlns="http://www.w3.org/2000/svg">
  <rect width="80" height="50" rx="8" ry="8" fill="#ffc107" />
  <text x="50%" y="50%" fill="#000" dy=".1em" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="42">'$i'</text>
</svg>' >$i.svg
done