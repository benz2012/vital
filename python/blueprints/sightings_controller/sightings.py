from flask import Blueprint, jsonify
from model.sighting_model import SightingModel

bp = Blueprint('sightings', __name__)
sighting_model = SightingModel()


@bp.route('', methods=['GET'], strict_slashes=False)
def get_all_sightings():
    try:
        return jsonify(sighting_model.get_all_sightings()), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@bp.route('/<int:sighting_id>', methods=['GET'])
def get_sighting_by_id(sighting_id):
    try:
        return jsonify(sighting_model.get_sighting_by_id(sighting_id)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400