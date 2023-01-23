import json
import glob

fileNames = glob.glob("./assets/geometry/objects/*")

jsonFile = json.dumps({"urls": fileNames})

with open("./assets/geometry/objects.json", "w") as outfile:
    outfile.write(jsonFile)