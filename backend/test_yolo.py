from ultralytics import YOLO

model = YOLO("yolov8n.pt")

results = model("victim.jpg")

for r in results:
    print(r.boxes)