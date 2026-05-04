-- Kunai mpv bridge: IPC user-data with the Kunai CLI (persistent session only on Unix).
-- user-data: kunai-skip-to, kunai-skip-auto, kunai-skip-kind, kunai-skip-label, kunai-skip-rev,
--             kunai-skip-prompt-ms (countdown + Bun auto-skip alignment)
-- kunai-request: next | previous | skip | auto-skip
--
-- Script-opts id `kunai-bridge`: margin_bottom, margin_right, chip_width, chip_height, prompt_seconds (Lua-only fallback if prompt-ms unset)

local o = {
  margin_bottom = "118",
  margin_right = "44",
  chip_width = "280",
  chip_height = "58",
  prompt_seconds = "3",
}
do
  local ok, mod = pcall(require, "mp.options")
  if ok and mod and mod.read_options then
    mod.read_options(o, "kunai-bridge")
  end
end

local overlay = mp.create_osd_overlay("ass-events")
overlay.z = 1600

local prompt_redraw_timer = nil
local prompt_deadline_wall = nil
local prompt_is_auto = false
local prompt_label = ""
local prompt_total_sec = 3

local function signal(action)
  mp.set_property("user-data/kunai-request", action)
end

local function clear_prompt_timers()
  if prompt_redraw_timer ~= nil then
    prompt_redraw_timer:kill()
    prompt_redraw_timer = nil
  end
  prompt_deadline_wall = nil
  pcall(function() mp.remove_key_binding("kunai-skip-click") end)
end

local function hide_prompt_visual()
  clear_prompt_timers()
  overlay.data = ""
  overlay:remove()
end

local function layout_chip()
  local dim = mp.get_property_native("osd-dimensions", {})
  local w = dim.w or 1280
  local h = dim.h or 720
  local chip_w = tonumber(o.chip_width) or 280
  local chip_h = tonumber(o.chip_height) or 58
  local mr = tonumber(o.margin_right) or 44
  local mb = tonumber(o.margin_bottom) or 118
  local x1 = w - mr
  local y1 = h - mb
  local x0 = x1 - chip_w
  local y0 = y1 - chip_h
  return w, h, chip_w, chip_h, x0, y0, x1, y1
end

local function hit_skip_chip(mx, my)
  local _, _, chip_w, chip_h, x0, y0 = layout_chip()
  return mx >= x0 and mx <= x0 + chip_w and my >= y0 and my <= y0 + chip_h
end

local function draw_prompt_frame()
  if not prompt_deadline_wall then return end
  local skip_to = mp.get_property_number("user-data/kunai-skip-to", -1)
  if skip_to <= 0 then
    hide_prompt_visual()
    return
  end
  local w, h, chip_w, chip_h, x0, y0, _, y1 = layout_chip()
  local remaining = prompt_deadline_wall - mp.get_time()
  if remaining < 0 then remaining = 0 end
  local sec = math.max(0, math.ceil(remaining))
  local p = 1 - (remaining / prompt_total_sec)
  if p < 0 then p = 0 end
  if p > 1 then p = 1 end
  local bar_n = 22
  local filled = math.floor(bar_n * p + 0.5)
  local bar = string.rep("=", filled) .. string.rep(".", bar_n - filled)
  local subline
  if prompt_is_auto then
    subline = "Auto-skip in " .. tostring(sec) .. "s  ·  i / click now"
  else
    subline = (sec > 0) and (tostring(sec) .. "s  ·  i / click") or "i / click to skip"
  end
  local bar_y = y1 - 14
  local ass = string.format(
    "{\\an7\\pos(%d,%d)\\fs24\\b1\\bord1\\3c&HFFFFFF&\\1c&H1A1A1A&}%s\\N{\\fs12\\b0\\1c&H888888&}%s\\N{\\fs14\\b0\\1c&HFFFFFF&}%s",
    x0 + 10,
    y0 + 6,
    prompt_label,
    bar,
    subline
  )
  overlay.res_x = w
  overlay.res_y = h
  overlay.data = ass
  overlay:update()
end

local function on_skip_click(e)
  if e and e.event ~= "up" then return end
  local pos = mp.get_property_native("mouse-pos", {})
  if not pos or not pos.x then return end
  if hit_skip_chip(pos.x, pos.y) and mp.get_property_number("user-data/kunai-skip-to", -1) > 0 then
    signal("skip")
  end
end

local function restart_skip_prompt()
  hide_prompt_visual()
  local skip_to = mp.get_property_number("user-data/kunai-skip-to", -1)
  if skip_to <= 0 then return end
  prompt_is_auto = mp.get_property("user-data/kunai-skip-auto") == "1"
  prompt_label = mp.get_property("user-data/kunai-skip-label", "SKIP")
  if prompt_label == "" then prompt_label = "SKIP" end
  local ms = mp.get_property_number("user-data/kunai-skip-prompt-ms", 0)
  if ms >= 1000 then
    prompt_total_sec = ms / 1000
  else
    prompt_total_sec = tonumber(o.prompt_seconds) or 3
  end
  if prompt_total_sec < 0.5 then prompt_total_sec = 3 end
  prompt_deadline_wall = mp.get_time() + prompt_total_sec
  overlay.hidden = false
  draw_prompt_frame()
  prompt_redraw_timer = mp.add_periodic_timer(0.05, function()
    local st = mp.get_property_number("user-data/kunai-skip-to", -1)
    if st <= 0 then
      hide_prompt_visual()
      return
    end
    local rem = prompt_deadline_wall - mp.get_time()
    draw_prompt_frame()
    if rem <= 0 then
      if prompt_redraw_timer ~= nil then
        prompt_redraw_timer:kill()
        prompt_redraw_timer = nil
      end
      pcall(function() mp.remove_key_binding("kunai-skip-click") end)
      overlay.data = ""
      overlay:remove()
      if prompt_is_auto then
        signal("auto-skip")
      end
    end
  end)
  mp.add_forced_key_binding("MBTN_LEFT", "kunai-skip-click", on_skip_click, { complex = true })
end

mp.observe_property("user-data/kunai-skip-rev", "native", function()
  restart_skip_prompt()
end)

local function do_next()
  signal("next")
  mp.commandv("stop")
end

local function do_previous()
  signal("previous")
  mp.commandv("stop")
end

local function do_skip()
  if mp.get_property_number("user-data/kunai-skip-to", -1) > 0 then
    signal("skip")
  end
end

mp.add_key_binding("n", "kunai-next", do_next, { repeatable = false })
mp.add_key_binding("N", "kunai-next-shift", do_next, { repeatable = false })
mp.add_key_binding("p", "kunai-prev", do_previous, { repeatable = false })
mp.add_key_binding("P", "kunai-prev-shift", do_previous, { repeatable = false })
mp.add_key_binding("i", "kunai-skip", do_skip, { repeatable = false })
mp.add_key_binding("I", "kunai-skip-shift", do_skip, { repeatable = false })
