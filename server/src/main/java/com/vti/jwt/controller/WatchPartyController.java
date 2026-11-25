package com.vti.jwt.controller;

import com.vti.jwt.dto.response.ResponseModel;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@RestController
@RequestMapping("/api/watchparty")
@CrossOrigin(origins = "*", maxAge = 3600)
public class WatchPartyController {

    public static class Participant {
        public String id;
        public String name;
        public String avatar;
        public boolean isVip;
        public boolean isHost;
        public boolean isMicMuted = true;
        public String joinedAt;

        public Participant() {}

        public Participant(String id, String name, String avatar, boolean isVip, boolean isHost, String joinedAt) {
            this.id = id;
            this.name = name;
            this.avatar = avatar;
            this.isVip = isVip;
            this.isHost = isHost;
            this.joinedAt = joinedAt;
        }
    }

    public static class ChatMsg {
        public String id;
        public String user;
        public String userId;
        public String avatar;
        public boolean isVip;
        public boolean isHost;
        public boolean isSystem;
        public String text;
        public String time;
        public boolean isSpoiler;

        public ChatMsg() {}

        public ChatMsg(String id, String user, String avatar, boolean isVip, boolean isHost, String text, String time) {
            this.id = id;
            this.user = user;
            this.avatar = avatar;
            this.isVip = isVip;
            this.isHost = isHost;
            this.text = text;
            this.time = time;
        }
    }

    public static class Room {
        public String id;
        public String title;
        public String movieId;
        public String movieTitle;
        public String streamUrl;
        public String coverImage;
        public String hostId;
        public String hostName;
        public boolean hostLock = true;
        public boolean isPlaying = true;
        public double currentTime = 145.0;
        public int maxCount = 20;
        public String pinnedMessage = "Chào mừng cả nhà đến với phòng xem chung CineStreams!";
        public String createdAt = Instant.now().toString();

        public Map<String, Participant> participants = new ConcurrentHashMap<>();
        public List<ChatMsg> chatMessages = new CopyOnWriteArrayList<>();
        public transient List<SseEmitter> sseEmitters = new CopyOnWriteArrayList<>();
    }

    private final Map<String, Room> rooms = new ConcurrentHashMap<>();

    public WatchPartyController() {
        initDefaultRooms();
    }

    private void initDefaultRooms() {
        Room r1 = new Room();
        r1.id = "room-dune-2";
        r1.title = "Phòng Xem Chung: Dune 2 (Đêm Cuối Tuần)";
        r1.movieId = "dune-2";
        r1.movieTitle = "Dune: Hành Tinh Cát - Phần 2";
        r1.streamUrl = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";
        r1.coverImage = "https://lh3.googleusercontent.com/aida-public/AB6AXuCN2LMdr7k6t28pixcqtV_DU65R9YZc6w1Fa_ofgP4IwbnJCRwg4sKZs9nvQ40M0rQPiGuXT_whrQdyb2iltXdCebb-KJylFIFvezB82DegiDGQyGgkTY98eVWk2seEB3-zres6kWJn-SZG_yTH0x0oPrzHFeDIkA6g2zyAlSE5qVt9uHONADDErNAaIEAn92dssTytRm4AFrQAfOeIvPpapO6-EbMVeGb1VJ_UXDyWlKXs68gnjWjb3w";
        r1.hostId = "host-minhhoang";
        r1.hostName = "Minh Hoàng (VIP Host)";
        r1.hostLock = true;
        r1.isPlaying = true;
        r1.currentTime = 145.0;
        r1.pinnedMessage = "Chào mừng cả nhà! Bật loa to lên để trải nghiệm âm thanh Dolby Atmos nào 🔥";

        r1.participants.put("p1", new Participant("p1", "Minh Hoàng (Host)", "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150", true, true, "20:00"));
        r1.participants.put("p2", new Participant("p2", "Bảo Ngọc 👑", "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150", true, false, "20:05"));
        r1.participants.put("p3", new Participant("p3", "Tuấn Anh", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150", false, false, "20:10"));

        r1.chatMessages.add(new ChatMsg("m1", "Minh Hoàng (Host)", "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150", true, true, "Chào mừng cả nhà! Bật loa to lên để trải nghiệm âm thanh Dolby Atmos nào 🔥", "20:15"));
        r1.chatMessages.add(new ChatMsg("m2", "Bảo Ngọc 👑", "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150", true, false, "Âm thanh Dolby Atmos nghe rung cả phòng khách luôn á 🍿", "20:16"));

        rooms.put(r1.id, r1);

        Room rVip = new Room();
        rVip.id = "room-vip-live";
        rVip.title = r1.title;
        rVip.movieId = r1.movieId;
        rVip.movieTitle = r1.movieTitle;
        rVip.streamUrl = r1.streamUrl;
        rVip.coverImage = r1.coverImage;
        rVip.hostId = r1.hostId;
        rVip.hostName = r1.hostName;
        rVip.participants.putAll(r1.participants);
        rVip.chatMessages.addAll(r1.chatMessages);
        rooms.put(rVip.id, rVip);

        Room r2 = new Room();
        r2.id = "room-oppenheimer";
        r2.title = "Phòng Chiếu IMAX 4K: Oppenheimer";
        r2.movieId = "oppenheimer";
        r2.movieTitle = "Oppenheimer";
        r2.streamUrl = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";
        r2.coverImage = "https://lh3.googleusercontent.com/aida-public/AB6AXuBuG3txMZplmamoKp2e9nRbwOyR9jS12jeDZuTNiqg-V9gcwC7KEmAo5jwkIAR6LEPIL5zrkWkx1Te6QYoKBLDvyXQ9NU0XKcXASaziWS9XoNGw1gxEJpmC0YSssjjNNnbkM9l4-xH_OKkI6IEqS5QJFpNSfO54GBuQvYyGbH9viRRvJ83f5l8ri3J1Eh7DFrWYiV0hqbKXcl4jDVUo7SX36hpGlcuANFHwvkqy5mHXV8WsG3tKcp8CZg";
        r2.hostId = "host-denis";
        r2.hostName = "Denis Trần (VIP)";
        r2.currentTime = 320.0;
        rooms.put(r2.id, r2);
    }

    private Map<String, Object> formatRoom(Room r) {
        Map<String, Object> map = new LinkedHashMap<>();
        int mins = (int) (r.currentTime / 60);
        int secs = (int) (r.currentTime % 60);
        String timeStr = String.format("%02d:%02d", mins, secs);

        map.put("id", r.id);
        map.put("title", r.title);
        map.put("movieId", r.movieId);
        map.put("movieTitle", r.movieTitle);
        map.put("streamUrl", r.streamUrl);
        map.put("hostName", r.hostName);
        map.put("hostId", r.hostId);
        map.put("hostLock", r.hostLock);
        map.put("isPlaying", r.isPlaying);
        map.put("currentTimeSeconds", r.currentTime);
        map.put("activeCount", r.participants.size());
        map.put("maxCount", r.maxCount);
        map.put("currentTime", timeStr);
        map.put("coverImage", r.coverImage);
        map.put("isLive", true);
        map.put("pinnedMessage", r.pinnedMessage);
        map.put("createdAt", r.createdAt);
        map.put("participants", new ArrayList<>(r.participants.values()));
        map.put("chatMessages", new ArrayList<>(r.chatMessages));
        return map;
    }

    private void broadcast(Room r, Object eventData) {
        List<SseEmitter> deadEmitters = new ArrayList<>();
        for (SseEmitter emitter : r.sseEmitters) {
            try {
                emitter.send(SseEmitter.event().data(eventData));
            } catch (IOException e) {
                deadEmitters.add(emitter);
            }
        }
        r.sseEmitters.removeAll(deadEmitters);
    }

    @GetMapping({"/rooms", "/rooms/"})
    public ResponseEntity<Map<String, Object>> getRooms() {
        List<Map<String, Object>> list = new ArrayList<>();
        for (Room r : rooms.values()) {
            list.add(formatRoom(r));
        }
        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("rooms", list);
        return ResponseEntity.ok(resp);
    }

    @PostMapping({"/rooms", "/rooms/"})
    public ResponseEntity<Map<String, Object>> createRoom(@RequestBody Map<String, Object> body) {
        String title = (String) body.get("title");
        String movieId = (String) body.getOrDefault("movieId", "dune-2");
        String movieTitle = (String) body.getOrDefault("movieTitle", "Phim Điện Ảnh");
        String streamUrl = (String) body.getOrDefault("streamUrl", "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8");
        String coverImage = (String) body.getOrDefault("coverImage", "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200&auto=format&fit=crop");
        String hostName = (String) body.getOrDefault("hostName", "Bạn (Host)");
        String hostId = (String) body.getOrDefault("hostId", "host-" + System.currentTimeMillis());

        String roomId = "room-" + movieId + "-" + UUID.randomUUID().toString().substring(0, 5);

        Room r = new Room();
        r.id = roomId;
        r.title = title != null && !title.trim().isEmpty() ? title : "Phòng xem chung: " + movieTitle;
        r.movieId = movieId;
        r.movieTitle = movieTitle;
        r.streamUrl = streamUrl;
        r.coverImage = coverImage;
        r.hostId = hostId;
        r.hostName = hostName;
        r.currentTime = 0;
        r.isPlaying = true;
        if (body.get("maxCount") instanceof Number) {
            r.maxCount = ((Number) body.get("maxCount")).intValue();
        }
        if (body.get("hostLock") instanceof Boolean) {
            r.hostLock = (Boolean) body.get("hostLock");
        }

        Participant hostP = new Participant(hostId, hostName, "https://lh3.googleusercontent.com/aida-public/AB6AXuDKI3gRB2-ajZZGcKyE5j9o_QEHEa3jFKNQP2LDRuci6XUPZo7WjzRr67sHpmExkSNaTWfkgRQ-Itw30N5OIN9GZoYP9E-htmJ2SQsH9tVP6aCpsRVOaVnI8ltteCYpTHRUWXojhbkoUTwS8XpkDIHRXmFj83yGCFvjkLDR6vWk8GMveFcp6CcrbT50VV2sHcmj2ghAuV1CiQX4kVprpH10y-oErnTIfsTRLHwLctzwqvDUQAe87wgqBg", true, true, "20:00");
        r.participants.put(hostId, hostP);

        rooms.put(roomId, r);

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("room", formatRoom(r));
        return ResponseEntity.ok(resp);
    }

    @GetMapping({"/rooms/{roomId}", "/rooms/{roomId}/"})
    public ResponseEntity<Map<String, Object>> getRoom(@PathVariable String roomId) {
        Room r = rooms.get(roomId);
        if (r == null) {
            Map<String, Object> err = new HashMap<>();
            err.put("success", false);
            err.put("message", "Phòng không tồn tại hoặc đã đóng");
            return ResponseEntity.status(404).body(err);
        }

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("room", formatRoom(r));
        return ResponseEntity.ok(resp);
    }

    @GetMapping(value = "/rooms/{roomId}/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamEvents(@PathVariable String roomId, jakarta.servlet.http.HttpServletResponse response) {
        if (response != null) {
            response.setHeader("X-Accel-Buffering", "no");
            response.setHeader("Cache-Control", "no-cache, no-transform");
            response.setHeader("Connection", "keep-alive");
        }
        Room r = rooms.get(roomId);
        if (r == null) {
            SseEmitter closedEmitter = new SseEmitter(10000L);
            try {
                Map<String, Object> closedEvt = new HashMap<>();
                closedEvt.put("type", "ROOM_CLOSED");
                closedEvt.put("message", "Phòng này không tồn tại hoặc đã bị chủ phòng đóng và xóa.");
                closedEmitter.send(SseEmitter.event().data(closedEvt));
                closedEmitter.complete();
            } catch (Exception ignored) {}
            return closedEmitter;
        }

        final Room targetRoom = r;
        SseEmitter emitter = new SseEmitter(300_000L); // 5 minutes timeout
        targetRoom.sseEmitters.add(emitter);

        emitter.onCompletion(() -> targetRoom.sseEmitters.remove(emitter));
        emitter.onTimeout(() -> targetRoom.sseEmitters.remove(emitter));
        emitter.onError(e -> targetRoom.sseEmitters.remove(emitter));

        try {
            Map<String, Object> initial = new HashMap<>();
            initial.put("type", "INITIAL_STATE");
            initial.put("room", formatRoom(targetRoom));
            emitter.send(SseEmitter.event().data(initial));
        } catch (IOException e) {
            targetRoom.sseEmitters.remove(emitter);
        }

        return emitter;
    }

    @PostMapping("/rooms/{roomId}/action")
    public ResponseEntity<Map<String, Object>> handleAction(
            @PathVariable String roomId,
            @RequestBody Map<String, Object> body) {
        Room r = rooms.get(roomId);
        String type = (String) body.get("type");
        if (type == null) type = "";

        if (r == null) {
            if ("CLOSE_ROOM".equals(type) || "LEAVE".equals(type)) {
                Map<String, Object> resp = new HashMap<>();
                resp.put("success", true);
                resp.put("message", "Phòng đã đóng");
                return ResponseEntity.ok(resp);
            }
            Map<String, Object> err = new HashMap<>();
            err.put("success", false);
            err.put("message", "Phòng không tồn tại hoặc đã bị xóa");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(err);
        }

        Map<String, Object> broadcastEvent = new HashMap<>();
        broadcastEvent.put("type", type);
        broadcastEvent.put("timestamp", System.currentTimeMillis());

        switch (type) {
            case "PLAY":
                r.isPlaying = true;
                if (body.get("currentTime") instanceof Number) {
                    r.currentTime = ((Number) body.get("currentTime")).doubleValue();
                }
                broadcastEvent.put("currentTime", r.currentTime);
                broadcastEvent.put("isPlaying", true);
                broadcast(r, broadcastEvent);
                break;

            case "PAUSE":
                r.isPlaying = false;
                if (body.get("currentTime") instanceof Number) {
                    r.currentTime = ((Number) body.get("currentTime")).doubleValue();
                }
                broadcastEvent.put("currentTime", r.currentTime);
                broadcastEvent.put("isPlaying", false);
                broadcast(r, broadcastEvent);
                break;

            case "SEEK":
                if (body.get("currentTime") instanceof Number) {
                    r.currentTime = ((Number) body.get("currentTime")).doubleValue();
                }
                broadcastEvent.put("currentTime", r.currentTime);
                broadcastEvent.put("isPlaying", r.isPlaying);
                broadcast(r, broadcastEvent);
                break;

            case "SYNC_TIME":
                if (body.get("currentTime") instanceof Number) {
                    r.currentTime = ((Number) body.get("currentTime")).doubleValue();
                }
                if (body.get("isPlaying") instanceof Boolean) {
                    r.isPlaying = (Boolean) body.get("isPlaying");
                }
                broadcastEvent.put("currentTime", r.currentTime);
                broadcastEvent.put("isPlaying", r.isPlaying);
                broadcast(r, broadcastEvent);
                break;

            case "CHAT":
                ChatMsg msg = new ChatMsg();
                Map<String, Object> messageMap = (Map<String, Object>) body.get("message");
                if (messageMap != null && messageMap.get("id") != null) {
                    msg.id = (String) messageMap.get("id");
                } else {
                    msg.id = "msg-" + System.currentTimeMillis();
                }
                Map<String, Object> userMap = (Map<String, Object>) body.get("user");
                msg.user = userMap != null ? (String) userMap.getOrDefault("name", "Thành viên") : "Thành viên";
                msg.avatar = userMap != null ? (String) userMap.getOrDefault("avatar", "/default-avatar.png") : "";
                msg.isVip = userMap != null && Boolean.TRUE.equals(userMap.get("isVip"));
                msg.isHost = userMap != null && Boolean.TRUE.equals(userMap.get("isHost"));
                msg.text = messageMap != null ? (String) messageMap.getOrDefault("text", "") : (String) body.getOrDefault("text", "");
                msg.time = String.format("%02d:%02d", Calendar.getInstance().get(Calendar.HOUR_OF_DAY), Calendar.getInstance().get(Calendar.MINUTE));
                r.chatMessages.add(msg);
                if (r.chatMessages.size() > 100) {
                    r.chatMessages.remove(0);
                }
                broadcastEvent.put("message", msg);
                broadcast(r, broadcastEvent);
                break;

            case "REACTION":
                Map<String, Object> react = new HashMap<>();
                react.put("id", "react-" + System.currentTimeMillis());
                react.put("emoji", body.getOrDefault("emoji", "❤️"));
                react.put("x", Math.random() * 80 + 10);
                broadcastEvent.put("reaction", react);
                broadcast(r, broadcastEvent);
                break;

            case "JOIN":
                Map<String, Object> joinUser = (Map<String, Object>) body.get("user");
                if (joinUser != null && joinUser.get("id") != null) {
                    String uid = (String) joinUser.get("id");
                    String uname = (String) joinUser.getOrDefault("name", "Người xem mới");
                    String uavatar = (String) joinUser.getOrDefault("avatar", "/default-avatar.png");
                    boolean uvip = Boolean.TRUE.equals(joinUser.get("isVip"));
                    Participant p = new Participant(uid, uname, uavatar, uvip, uid.equals(r.hostId), "20:00");
                    r.participants.put(uid, p);

                    ChatMsg joinMsg = new ChatMsg();
                    joinMsg.id = "sys-join-" + System.currentTimeMillis();
                    joinMsg.user = "Hệ Thống CineStreams";
                    joinMsg.avatar = "/default-avatar.png";
                    joinMsg.isSystem = true;
                    joinMsg.text = uname + " vừa tham gia phòng xem chung";
                    joinMsg.time = String.format("%02d:%02d", Calendar.getInstance().get(Calendar.HOUR_OF_DAY), Calendar.getInstance().get(Calendar.MINUTE));
                    r.chatMessages.add(joinMsg);

                    broadcastEvent.put("type", "PARTICIPANT_JOINED");
                    broadcastEvent.put("participant", p);
                    broadcastEvent.put("systemMessage", joinMsg);
                    broadcastEvent.put("activeCount", r.participants.size());
                    broadcast(r, broadcastEvent);
                }
                break;

            case "CLOSE_ROOM":
                broadcastEvent.put("type", "ROOM_CLOSED");
                broadcastEvent.put("roomId", r.id);
                broadcastEvent.put("message", "Chủ phòng đã thoát và đóng phòng xem chung. Toàn bộ đoạn chat và phòng đã được xóa.");
                broadcast(r, broadcastEvent);
                r.chatMessages.clear();
                r.participants.clear();
                rooms.remove(r.id);
                break;

            case "LEAVE":
                boolean shouldClose = Boolean.TRUE.equals(body.get("closeRoom"));
                Map<String, Object> leaveUser = (Map<String, Object>) body.get("user");
                boolean isHostLeaving = false;
                if (leaveUser != null) {
                    String uid = (String) leaveUser.get("id");
                    String uname = (String) leaveUser.get("name");
                    if ((uid != null && uid.equals(r.hostId)) || (uname != null && uname.equals(r.hostName))) {
                        isHostLeaving = true;
                    }
                }
                if (shouldClose || isHostLeaving) {
                    broadcastEvent.put("type", "ROOM_CLOSED");
                    broadcastEvent.put("roomId", r.id);
                    broadcastEvent.put("message", "Chủ phòng đã thoát và đóng phòng xem chung. Toàn bộ đoạn chat và phòng đã được xóa.");
                    broadcast(r, broadcastEvent);
                    r.chatMessages.clear();
                    r.participants.clear();
                    rooms.remove(r.id);
                    break;
                }

                if (leaveUser != null && leaveUser.get("id") != null) {
                    String uid = (String) leaveUser.get("id");
                    Participant removedP = r.participants.remove(uid);
                    String uname = removedP != null ? removedP.name : (String) leaveUser.getOrDefault("name", "Một thành viên");

                    ChatMsg leaveMsg = new ChatMsg();
                    leaveMsg.id = "sys-leave-" + System.currentTimeMillis();
                    leaveMsg.user = "Hệ Thống CineStreams";
                    leaveMsg.avatar = "/default-avatar.png";
                    leaveMsg.isSystem = true;
                    leaveMsg.text = uname + " đã rời phòng xem";
                    leaveMsg.time = String.format("%02d:%02d", Calendar.getInstance().get(Calendar.HOUR_OF_DAY), Calendar.getInstance().get(Calendar.MINUTE));
                    r.chatMessages.add(leaveMsg);

                    broadcastEvent.put("type", "PARTICIPANT_LEFT");
                    broadcastEvent.put("userId", uid);
                    broadcastEvent.put("userName", uname);
                    broadcastEvent.put("systemMessage", leaveMsg);
                    broadcastEvent.put("activeCount", r.participants.size());
                    broadcast(r, broadcastEvent);
                }
                break;

            case "TOGGLE_LOCK":
                if (body.get("hostLock") instanceof Boolean) {
                    r.hostLock = (Boolean) body.get("hostLock");
                }
                broadcastEvent.put("type", "HOST_LOCK_CHANGED");
                broadcastEvent.put("hostLock", r.hostLock);
                broadcast(r, broadcastEvent);
                break;

            case "TOGGLE_MIC":
                Map<String, Object> micUser = (Map<String, Object>) body.get("user");
                boolean muted = true;
                if (body.get("isMicMuted") instanceof Boolean) {
                    muted = (Boolean) body.get("isMicMuted");
                }
                String targetUid = micUser != null ? (String) micUser.get("id") : null;
                String targetUname = micUser != null ? (String) micUser.get("name") : null;

                if (targetUid != null && r.participants.containsKey(targetUid)) {
                    r.participants.get(targetUid).isMicMuted = muted;
                } else if (targetUname != null) {
                    for (Participant p : r.participants.values()) {
                        if (targetUname.equals(p.name)) {
                            p.isMicMuted = muted;
                            targetUid = p.id;
                            break;
                        }
                    }
                }

                broadcastEvent.put("type", "MIC_STATUS_CHANGED");
                broadcastEvent.put("userId", targetUid);
                broadcastEvent.put("userName", targetUname);
                broadcastEvent.put("isMicMuted", muted);
                broadcast(r, broadcastEvent);
                break;

            case "CHANGE_MOVIE":
                String newMovieId = (String) body.getOrDefault("movieId", r.movieId);
                String newMovieTitle = (String) body.getOrDefault("movieTitle", r.movieTitle);
                String newStreamUrl = (String) body.getOrDefault("streamUrl", r.streamUrl);
                String newCover = (String) body.getOrDefault("coverImage", r.coverImage);

                r.movieId = newMovieId;
                r.movieTitle = newMovieTitle;
                r.streamUrl = newStreamUrl;
                if (newCover != null && !newCover.isEmpty()) {
                    r.coverImage = newCover;
                }
                r.currentTime = 0.0;
                r.isPlaying = true;

                Map<String, Object> movieUser = (Map<String, Object>) body.get("user");
                String hName = movieUser != null ? (String) movieUser.getOrDefault("name", r.hostName) : r.hostName;

                ChatMsg movieChangeMsg = new ChatMsg();
                movieChangeMsg.id = "sys-movie-" + System.currentTimeMillis();
                movieChangeMsg.user = "Hệ Thống CineStreams";
                movieChangeMsg.avatar = "/default-avatar.png";
                movieChangeMsg.isSystem = true;
                movieChangeMsg.text = hName + " đã đổi sang phim: " + newMovieTitle + ". Toàn bộ phòng đã đồng bộ!";
                movieChangeMsg.time = String.format("%02d:%02d", Calendar.getInstance().get(Calendar.HOUR_OF_DAY), Calendar.getInstance().get(Calendar.MINUTE));
                r.chatMessages.add(movieChangeMsg);

                broadcastEvent.put("type", "MOVIE_CHANGED");
                broadcastEvent.put("movieId", newMovieId);
                broadcastEvent.put("movieTitle", newMovieTitle);
                broadcastEvent.put("streamUrl", newStreamUrl);
                broadcastEvent.put("coverImage", r.coverImage);
                broadcastEvent.put("room", formatRoom(r));
                broadcastEvent.put("systemMessage", movieChangeMsg);
                broadcast(r, broadcastEvent);
                break;
        }

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("room", formatRoom(r));
        return ResponseEntity.ok(resp);
    }
}
