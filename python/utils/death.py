terminators = []

def add_terminator(child):
    terminators.append(child)

def get_terminators():
    return terminators

def remove_last_terminator():
    del terminators[-1]
