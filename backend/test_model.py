import pickle

model_dict = pickle.load(open('model.p', 'rb'))
model = model_dict['model']

print("🧠 Model classes:", model.classes_)
print("📦 Total classes:", len(model.classes_))
